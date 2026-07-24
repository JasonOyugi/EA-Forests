"use client"

import * as React from "react"
import * as THREE from "three"
import { ArrowLeft, Atom, Droplets, HeartPulse, Moon, Zap, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type VitalityMode = "glucose" | "heart" | "hydration" | "recovery"

interface ModeConfig {
  id: VitalityMode
  label: string
  metric: string
  value: string
  description: string
  icon: LucideIcon
  color: string
  secondary: string
}

const modes: ModeConfig[] = [
  {
    id: "glucose",
    label: "Glucose Flow",
    metric: "Estimated variability",
    value: "Balanced",
    description: "Smooth glucose rhythm with fewer sharp peaks.",
    icon: Zap,
    color: "#f59e0b",
    secondary: "#22c55e",
  },
  {
    id: "heart",
    label: "Cardio Signal",
    metric: "Circulation load",
    value: "Steady",
    description: "A calm pulse field for sustained daily activity.",
    icon: HeartPulse,
    color: "#ef4444",
    secondary: "#38bdf8",
  },
  {
    id: "hydration",
    label: "Hydration Wave",
    metric: "Fluid balance",
    value: "Supported",
    description: "A clearer hydration band around the metabolic core.",
    icon: Droplets,
    color: "#06b6d4",
    secondary: "#8b5cf6",
  },
  {
    id: "recovery",
    label: "Recovery Cycle",
    metric: "Rest quality",
    value: "Restoring",
    description: "Slower motion for sleep, repair, and nervous-system recovery.",
    icon: Moon,
    color: "#7c3aed",
    secondary: "#14b8a6",
  },
]

function getMode(id: VitalityMode) {
  return modes.find((mode) => mode.id === id) ?? modes[0]
}

function createParticleTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext("2d")

  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, "rgba(255,255,255,1)")
    gradient.addColorStop(0.45, "rgba(255,255,255,0.42)")
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
  }

  return new THREE.CanvasTexture(canvas)
}

function VitalityScene({
  mode,
  intensity,
}: {
  mode: ModeConfig
  intensity: number
}) {
  const mountRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0.4, 7.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const primary = new THREE.Color(mode.color)
    const secondary = new THREE.Color(mode.secondary)
    const root = new THREE.Group()
    scene.add(root)

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.24, 5),
      new THREE.MeshPhysicalMaterial({
        color: primary,
        roughness: 0.22,
        metalness: 0.08,
        transmission: 0.42,
        thickness: 0.35,
        transparent: true,
        opacity: 0.86,
        clearcoat: 0.8,
        emissive: primary,
        emissiveIntensity: 0.08 + intensity * 0.003,
      })
    )
    root.add(core)

    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(1.62, 48, 24),
      new THREE.MeshBasicMaterial({
        color: secondary,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      })
    )
    root.add(wireframe)

    const ringGroup = new THREE.Group()
    root.add(ringGroup)

    Array.from({ length: 4 }).forEach((_, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.1 + index * 0.34, 0.01 + index * 0.003, 12, 140),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? primary : secondary,
          transparent: true,
          opacity: 0.54 - index * 0.08,
        })
      )
      ring.rotation.x = Math.PI / 2.4 + index * 0.42
      ring.rotation.y = index * 0.55
      ringGroup.add(ring)
    })

    const particleCount = 520
    const positions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)
    const color = new THREE.Color()

    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.4 + Math.random() * 2.45
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.68
      positions[index * 3 + 2] = radius * Math.cos(phi)

      color.copy(index % 3 === 0 ? primary : secondary).lerp(new THREE.Color("#ffffff"), Math.random() * 0.28)
      particleColors[index * 3] = color.r
      particleColors[index * 3 + 1] = color.g
      particleColors[index * 3 + 2] = color.b
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.82,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    root.add(particles)

    const lightOne = new THREE.PointLight(primary, 4.2, 14)
    lightOne.position.set(3, 2.7, 4)
    scene.add(lightOne)

    const lightTwo = new THREE.PointLight(secondary, 3.4, 12)
    lightTwo.position.set(-4, -1.8, 3)
    scene.add(lightTwo)
    scene.add(new THREE.AmbientLight("#ffffff", 0.62))

    const pointer = new THREE.Vector2(0, 0)
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    mount.addEventListener("pointermove", onPointerMove)
    window.addEventListener("resize", onResize)

    let frameId = 0
    const clock = new THREE.Clock()
    const speed = 0.22 + intensity / 180

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      const pulse = 1 + Math.sin(elapsed * (1.3 + speed)) * (0.025 + intensity * 0.00045)

      core.scale.setScalar(pulse)
      core.rotation.x = elapsed * 0.11 + pointer.y * 0.12
      core.rotation.y = elapsed * 0.18 + pointer.x * 0.18
      wireframe.rotation.y = -elapsed * 0.08
      wireframe.rotation.z = elapsed * 0.05
      ringGroup.rotation.x = pointer.y * 0.12
      ringGroup.rotation.y = elapsed * speed + pointer.x * 0.28
      particles.rotation.y = -elapsed * (0.035 + intensity / 900)
      particles.rotation.x = Math.sin(elapsed * 0.2) * 0.08 + pointer.y * 0.08
      camera.position.x += (pointer.x * 0.45 - camera.position.x) * 0.035
      camera.position.y += (0.4 - pointer.y * 0.28 - camera.position.y) * 0.035
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.cancelAnimationFrame(frameId)
      mount.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("resize", onResize)
      mount.removeChild(renderer.domElement)
      particleMaterial.map?.dispose()
      particleMaterial.dispose()
      particleGeometry.dispose()
      core.geometry.dispose()
      ;(core.material as THREE.Material).dispose()
      wireframe.geometry.dispose()
      ;(wireframe.material as THREE.Material).dispose()
      ringGroup.children.forEach((ring) => {
        const mesh = ring as THREE.Mesh
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      renderer.dispose()
    }
  }, [mode, intensity])

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />
}

export default function Vitality3DPage() {
  const [activeMode, setActiveMode] = React.useState<VitalityMode>("glucose")
  const [intensity, setIntensity] = React.useState(64)
  const mode = getMode(activeMode)

  return (
    <BaseLayout
      title="3D Vitality Explorer"
      description="Explore glucose, heart, hydration, and recovery signals as an interactive wellness field."
    >
      <div className="@container/main space-y-6 px-4 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/models">
            <ArrowLeft className="h-4 w-4" />
            Back to health tools
          </Link>
        </Button>

        <section className="relative min-h-[680px] overflow-hidden rounded-none bg-slate-950 text-white md:min-h-[720px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(20,184,166,0.2),transparent_24%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.86))]" />
          <VitalityScene mode={mode} intensity={intensity} />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-4 p-5 md:p-8">
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                <Atom className="h-3.5 w-3.5" />
                Immersive health tool
              </div>
              <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal md:text-6xl">
                {mode.label}
              </h2>
              <p className="max-w-lg text-base leading-7 text-white/76 md:text-lg">
                {mode.description}
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:p-8">
            <div className="pointer-events-auto grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {modes.map((item) => {
                const Icon = item.icon
                const isActive = item.id === activeMode

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMode(item.id)}
                    className={cn(
                      "min-h-28 rounded-lg border border-white/12 bg-white/10 p-4 text-left backdrop-blur transition hover:bg-white/16 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30",
                      isActive && "border-white/40 bg-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/58">
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-white/62">{item.metric}</p>
                  </button>
                )
              })}
            </div>

            <div className="pointer-events-auto rounded-lg border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Signal intensity</p>
                  <p className="text-xs text-white/62">Adjusts motion and glow</p>
                </div>
                <p className="text-3xl font-bold">{intensity}</p>
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor="vitality-intensity" className="sr-only">
                  Signal intensity
                </Label>
                <input
                  id="vitality-intensity"
                  type="range"
                  min={25}
                  max={100}
                  step={1}
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/16 accent-white"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </BaseLayout>
  )
}
