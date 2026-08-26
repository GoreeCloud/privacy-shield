import crypto from "node:crypto";

function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function withinScope(candidate, scope) {
  if (!scope) return true;
  if (scope.file_ids?.length && !scope.file_ids.includes(candidate.resource_id)) return false;
  if (scope.folder_ids?.length && !scope.folder_ids.includes(candidate.folder_id)) return false;
  if (scope.classifications?.length && !scope.classifications.includes(candidate.classification)) return false;
  return true;
}

export class AIPrivacyGateway {
  constructor({ enforcementPoint, contextStore = new Map() } = {}) {
    if (!enforcementPoint) throw new TypeError("AI Privacy Gateway requires enforcementPoint");
    this.enforcementPoint=enforcementPoint; this.contextStore=contextStore;
  }

  authorizeRetrieval({ request, model, conversation_id, task_id = null, allowed_models = [], temporary_context = true, no_training = true, retrieval_scope = null, allow_embeddings = false, allow_derived_data = false }) {
    if (!model?.id || !model?.processing_zone) throw new TypeError("AI model id and processing_zone are required");
    if (allowed_models.length && !allowed_models.includes(model.id)) throw new Error("AI_MODEL_NOT_AUTHORIZED");
    if (request.processing_zone !== model.processing_zone) throw new Error("AI_MODEL_PROCESSING_ZONE_MISMATCH");
    if (request.external_disclosure && model.provider_type !== "approved_external") throw new Error("AI_EXTERNAL_PROVIDER_NOT_AUTHORIZED");
    const authorization=this.enforcementPoint.authorize(request,{replay_policy:"single_use"});
    if (!authorization.capability_token) return {...authorization,context:null};
    const context={ context_id:id("psctx"), conversation_id, task_id, model_id:model.id, provider_type:model.provider_type, processing_zone:model.processing_zone, temporary:temporary_context, no_training, retrieval_scope:structuredClone(retrieval_scope), allow_embeddings, allow_derived_data, created_at:new Date().toISOString(), resource_id:request.resource.id, purpose:request.purpose, capability_token:authorization.capability_token, disposed:false };
    this.contextStore.set(context.context_id,structuredClone(context));
    return {...authorization,context:structuredClone(context)};
  }

  filterCandidates(context_id, candidates, { conversation_id, task_id = null } = {}) {
    const context=this.contextStore.get(context_id); if(!context) throw new Error("AI_CONTEXT_NOT_FOUND"); if(context.disposed) throw new Error("AI_CONTEXT_DISPOSED");
    if (conversation_id !== context.conversation_id) throw new Error("AI_CONTEXT_CONVERSATION_MISMATCH");
    if (context.task_id && task_id !== context.task_id) throw new Error("AI_CONTEXT_TASK_MISMATCH");
    return candidates.filter(candidate => withinScope(candidate,context.retrieval_scope)).filter(candidate => context.allow_embeddings || candidate.kind !== "embedding").filter(candidate => context.allow_derived_data || !candidate.derived);
  }

  minimizeExternalPayload(context_id, candidates) {
    const context=this.contextStore.get(context_id); if(!context) throw new Error("AI_CONTEXT_NOT_FOUND");
    if (context.provider_type !== "approved_external") return candidates;
    return candidates.map(candidate => ({ resource_id:candidate.resource_id, excerpt:candidate.excerpt, classification:candidate.classification }));
  }

  consumeRetrieval(context_id) {
    const context=this.contextStore.get(context_id); if(!context) throw new Error("AI_CONTEXT_NOT_FOUND"); if(context.disposed) throw new Error("AI_CONTEXT_DISPOSED");
    const enforcement=this.enforcementPoint.enforceOnce(context.capability_token,{resource_id:context.resource_id,purpose:context.purpose,processing_zone:context.processing_zone});
    return {context:structuredClone(context),enforcement};
  }

  disposeContext(context_id,{reason="INFERENCE_COMPLETE"}={}) {
    const context=this.contextStore.get(context_id); if(!context) throw new Error("AI_CONTEXT_NOT_FOUND");
    const disposed={...context,capability_token:null,disposed:true,disposed_at:new Date().toISOString(),disposal_reason:reason}; this.contextStore.set(context_id,disposed);
    const evidence=this.enforcementPoint.evidenceLedger.record({ request:{request_id:id("dispose"),requester:{id:"goreecloud.ai"},resource:{id:context.resource_id},purpose:context.purpose,operation:"dispose_context",processing_zone:context.processing_zone,destination:"none"}, decision:{decision_id:id("psd"),evidence_reference:id("pse"),outcome:"ALLOW",reason_code:"AI_CONTEXT_DISPOSED",processing_zone:context.processing_zone,policy_references:["ai.temporary-context"],obligations:["record_privacy_evidence"]}, metadata:{context_id,conversation_id:context.conversation_id,model_id:context.model_id,disposal_reason:reason} });
    return {...structuredClone(disposed),disposal_evidence_id:evidence.evidence_id,disposal_evidence_hash:evidence.evidence_hash};
  }

  getContext(context_id) { const context=this.contextStore.get(context_id); return context?structuredClone(context):null; }
}
