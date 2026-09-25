import { ExternalLinkIcon, MailIcon, PhoneIcon, UserIcon } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { EvidenceBadge } from "./evidence-badge"
import type { Actor } from "../types"

function Field({ label, value }: { label: string; value: React.ReactNode | null | undefined }) {
  if (value == null || value === "") return null
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function actorLocationLine(actor: Actor) {
  return [actor.townSite, actor.districtCounty, actor.regionState ?? actor.regionName, actor.country]
    .filter(Boolean)
    .join(", ")
}

export function ActorDetailDrawer({ actor, onClose }: { actor: Actor | null; onClose: () => void }) {
  const isMobile = useIsMobile()

  return (
    <Drawer
      open={!!actor}
      onOpenChange={(open) => !open && onClose()}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className="overflow-y-auto">
        {actor && (
          <>
            <DrawerHeader>
              <div className="flex items-start gap-3">
                <img
                  src={actor.images.imageUrl ?? actor.images.logoUrl ?? "/logo.webp"}
                  alt={actor.images.imageAlt ?? actor.name}
                  className="size-12 shrink-0 rounded-md border object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "/logo.webp"
                  }}
                />
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="truncate">{actor.name}</DrawerTitle>
                  <p className="text-sm text-muted-foreground">{actor.primaryRole ?? actor.actorType}</p>
                </div>
                <EvidenceBadge evidenceClass={actor.evidenceClass} />
              </div>
            </DrawerHeader>

            <div className="space-y-5 px-4 pb-6">
              {actor.summary && <p className="text-sm leading-relaxed">{actor.summary}</p>}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Location" value={actorLocationLine(actor)} />
                <Field label="Species / genetics" value={actor.species} />
                <Field label="Seedling capacity" value={actor.seedlingCapacityPerYear} />
                <Field label="Certification / status" value={actor.seedlingCertification ?? actor.certifications} />
                <Field label="Silviculture services" value={actor.silvicultureServices} />
                <Field label="Harvest & haulage services" value={actor.harvestHaulageServices} />
                <Field label="Processor products" value={actor.processorProducts} />
                <Field label="Raw material / species" value={actor.rawMaterialSpecies} />
                <Field label="Log specifications" value={actor.logSpecs} />
                <Field
                  label="Annual capacity"
                  value={actor.annualCapacityM3 != null ? `${actor.annualCapacityM3.toLocaleString()} m³/yr` : null}
                />
                <Field
                  label="Utilisation"
                  value={actor.utilisationPct != null ? `${actor.utilisationPct}%` : null}
                />
                <Field
                  label="Sourcing radius"
                  value={actor.sourcingRadiusKm != null ? `${actor.sourcingRadiusKm} km` : null}
                />
              </div>

              {(actor.website || actor.email || actor.phone || actor.contactPerson) && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
                  {actor.contactPerson && (
                    <p className="flex items-center gap-2 text-sm"><UserIcon className="size-4 text-muted-foreground" />{actor.contactPerson}</p>
                  )}
                  {actor.phone && (
                    <p className="flex items-center gap-2 text-sm"><PhoneIcon className="size-4 text-muted-foreground" />{actor.phone}</p>
                  )}
                  {actor.email && (
                    <p className="flex items-center gap-2 text-sm"><MailIcon className="size-4 text-muted-foreground" />{actor.email}</p>
                  )}
                  {actor.website && (
                    <a
                      href={actor.website.startsWith("http") ? actor.website : `https://${actor.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--market-accent)] hover:underline"
                    >
                      <ExternalLinkIcon className="size-4" />
                      {actor.website}
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
                <p className="uppercase tracking-wide">Evidence & provenance</p>
                <p>
                  Currentness: {actor.currentness ?? "unknown"} · {actor.sourceCount} source{actor.sourceCount === 1 ? "" : "s"}
                  {actor.lastVerifiedDate ? ` · last verified ${actor.lastVerifiedDate}` : ""}
                </p>
                {actor.sources.length > 0 && (
                  <ul className="space-y-1">
                    {actor.sources.map((source) => (
                      <li key={source.id}>
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">
                            {source.title}
                          </a>
                        ) : (
                          source.title
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {actor.issues.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-amber-600 dark:text-amber-400">
                    {actor.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>

              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Close</Button>
              </DrawerClose>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
