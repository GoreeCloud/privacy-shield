import crypto from "node:crypto";

function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }

export class AIPrivacyGateway {
  constructor({ enforcementPoint, contextStore = new Map() } = {}) {
    if (!enforcementPoint) throw new TypeError("AI Privacy Gateway requires enforcementPoint");
    this.enforcementPoint=enforcementPoint; this.contextStore=contextStore;
  }

  authorizeRetrieval({ request, model, conversation_id, task_id = null, allowed_models = [], temporary_context = true, no_training = true }) {
    if (!model?.id || !model?.processing_zone) throw new TypeError("AI model id and processing_zone are required");
    if (allowed_models.length && !allowed_models.includes(model.id)) throw new Error("AI_MODEL_NOT_AUTHORIZED");
    if (request.processing_zone !== model.processing_zone) throw new Error("AI_MODEL_PROCESSING_ZONE_MISMATCH");
    if (request.external_disclosure && model.provider_type !== "approved_external") throw new Error("AI_EXTERNAL_PROVIDER_NOT_AUTHORIZED");
    const authorization=this.enforcementPoint.authorize(request,{replay_policy:"single_use"});
    if (!authorization.capability_token) return {...authorization,context:null};
    const context={ context_id:id("psctx"), conversation_id, task_id, model_id:model.id, processing_zone:model.processing_zone, temporary:temporary_context, no_training, created_at:new Date().toISOString(), resource_id:request.resource.id, purpose:request.purpose, capability_token:authorization.capability_token, disposed:false };
    this.contextStore.set(context.context_id,structuredClone(context));
    return {...authorization,context:structuredClone(context)};
  }

  consumeRetrieval(context_id) {
    const context=this.contextStore.get(context_id); if(!context) throw new Error("AI_CONTEXT_NOT_FOUND"); if(context.disposed) throw new Error("AI_CONTEXT_DISPOSED");
    const enforcement=this.enforcementPoint.enforceOnce(context.capability_token,{resource_id:context.resource_id,purpose:context.purpose,processing_zone:context.processing_zone});
    return {context:structuredClone(context),enforcement};
  }

  disposeContext(context_id,{reason="INFERENCE_COMPLETE"}={}) {
    const context=this.contextStore.get(context_id); if(!context) throw new Error("AI_CONTEXT_NOT_FOUND");
    const disposed={...context,capability_token:null,disposed:true,disposed_at:new Date().toISOString(),disposal_reason:reason}; this.contextStore.set(context_id,disposed); return structuredClone(disposed);
  }

  getContext(context_id) { const context=this.contextStore.get(context_id); return context?structuredClone(context):null; }
}
