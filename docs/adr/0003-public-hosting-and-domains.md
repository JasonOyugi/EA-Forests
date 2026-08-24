# ADR 0003: Public hosting and domains

Status: pending infrastructure and SEO decision  
Decision owner: product, engineering and SEO  
Decision deadline: before staging becomes publicly crawlable

The implementation defaults to 'hub.eaforests.com' for the publication, 'app.eaforests.com' for tools and marketplace, and 'www.eaforests.com' for corporate information. All origins are environment-configured.

Before production, compare the independent subdomain with proxying publication routes under the primary domain. The selected host must support Next.js rendering, revalidation, image/social generation, redirects, health checks and rollback. Only one canonical URL may exist for each published record.
