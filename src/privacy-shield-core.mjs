function normalizeHost(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\.+$/, "");
}

function hostMatchesDomain(host, domain) {
  const normalizedHost = normalizeHost(host);
  const normalizedDomain = normalizeHost(domain);
  return Boolean(
    normalizedHost &&
      normalizedDomain &&
      (normalizedHost === normalizedDomain ||
        normalizedHost.endsWith(`.${normalizedDomain}`))
  );
}

function isHttpURL(url) {
  return url.protocol === "http:" || url.protocol === "https:";
}

function isTrackingParameter(name, patterns) {
  const normalized = String(name).toLowerCase();
  return patterns.some(pattern => {
    const candidate = String(pattern).toLowerCase();
    return candidate.endsWith("*")
      ? normalized.startsWith(candidate.slice(0, -1))
      : normalized === candidate;
  });
}

export class PrivacyShieldCore {
  constructor(config) {
    if (!config || config.feature !== "GoreeCloud Privacy Shield") {
      throw new TypeError("A valid GoreeCloud Privacy Shield configuration is required");
    }

    this.config = config;
    this.contentExceptions = new Set();
    this.trackerExceptions = new Set();
    this.trackerEvidence = new Map();
    this.localResources = new Map(
      (config.components.local_resources.resources ?? []).map(resource => [
        resource.url,
        resource,
      ])
    );
  }

  addContentBlockingException(host) {
    const normalized = normalizeHost(host);
    if (normalized) this.contentExceptions.add(normalized);
  }

  removeContentBlockingException(host) {
    this.contentExceptions.delete(normalizeHost(host));
  }

  addTrackerException(host) {
    const normalized = normalizeHost(host);
    if (normalized) this.trackerExceptions.add(normalized);
  }

  removeTrackerException(host) {
    this.trackerExceptions.delete(normalizeHost(host));
  }

  clearSiteExceptions() {
    this.contentExceptions.clear();
    this.trackerExceptions.clear();
  }

  shouldBlockContent(requestHost, firstPartyHost = "") {
    const component = this.config.components.content_blocking;
    if (!component.enabled) return false;

    const request = normalizeHost(requestHost);
    const firstParty = normalizeHost(firstPartyHost);
    if (!request || (firstParty && hostMatchesDomain(request, firstParty))) return false;

    if ([...this.contentExceptions].some(domain => hostMatchesDomain(firstParty || request, domain))) {
      return false;
    }

    return component.hosts.some(domain => hostMatchesDomain(request, domain));
  }

  cleanURL(spec) {
    const component = this.config.components.url_cleaning;
    if (!component.enabled) return spec;

    let url;
    try {
      url = new URL(spec);
    } catch {
      return spec;
    }

    if (!isHttpURL(url)) return spec;
    if (component.exempt_hosts.some(domain => hostMatchesDomain(url.hostname, domain))) {
      return spec;
    }

    const names = [...url.searchParams.keys()];
    for (const name of names) {
      if (isTrackingParameter(name, component.tracking_parameters)) {
        url.searchParams.delete(name);
      }
    }
    return url.toString();
  }

  recordThirdPartyObservation(firstPartyHost, thirdPartyHost, hasTrackingSignal) {
    const component = this.config.components.tracker_protection;
    if (!component.enabled || !hasTrackingSignal) return false;

    const firstParty = normalizeHost(firstPartyHost);
    const thirdParty = normalizeHost(thirdPartyHost);
    if (!firstParty || !thirdParty || hostMatchesDomain(thirdParty, firstParty)) return false;
    if ([...this.trackerExceptions].some(domain => hostMatchesDomain(firstParty, domain))) return false;

    let observed = this.trackerEvidence.get(thirdParty);
    if (!observed) {
      observed = new Set();
      this.trackerEvidence.set(thirdParty, observed);
    }
    observed.add(firstParty);
    return observed.size >= component.minimum_distinct_first_party_sites;
  }

  shouldBlockThirdParty(firstPartyHost, thirdPartyHost) {
    const component = this.config.components.tracker_protection;
    if (!component.enabled) return false;

    const firstParty = normalizeHost(firstPartyHost);
    const thirdParty = normalizeHost(thirdPartyHost);
    if (!firstParty || !thirdParty || hostMatchesDomain(thirdParty, firstParty)) return false;
    if ([...this.trackerExceptions].some(domain => hostMatchesDomain(firstParty, domain))) return false;

    return (
      this.trackerEvidence.get(thirdParty)?.size ?? 0
    ) >= component.minimum_distinct_first_party_sites;
  }

  localResourceFor(spec) {
    const component = this.config.components.local_resources;
    if (!component.enabled || component.mode !== "exact-byte-match-only") return null;
    return this.localResources.get(spec) ?? null;
  }

  clearTrackerEvidence() {
    this.trackerEvidence.clear();
  }
}

export { hostMatchesDomain, normalizeHost };
