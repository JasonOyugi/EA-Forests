"use client"

import * as React from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { ArrowLeft, Atom, CircleHelp, Hand, Rotate3D, ZoomIn } from "lucide-react"
import { Link } from "react-router-dom"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AtomKind = "carbon" | "oxygen"

type MoleculeAtom = {
  id: string
  element: "C" | "O"
  kind: AtomKind
  position: [number, number, number]
  title: string
  summary: string
  advice: string
}

const atoms: MoleculeAtom[] = [
  { id: "c1", element: "C", kind: "carbon", position: [-1.35, 0.55, 0], title: "Meal rhythm", summary: "The first carbon marks the steady base of the molecule.", advice: "Build meals around a reliable rhythm. Skipping and compensating later can make glucose patterns harder to read." },
  { id: "c2", element: "C", kind: "carbon", position: [-0.45, 1.16, 0.08], title: "Fibre first", summary: "A connected carbon point for your food foundation.", advice: "Make vegetables, pulses, or other fibre-rich foods the anchor of a meal before more rapidly absorbed carbohydrates." },
  { id: "c3", element: "C", kind: "carbon", position: [0.65, 0.78, -0.04], title: "Movement signal", summary: "This branch represents how muscles use circulating glucose.", advice: "A short walk after eating can support glucose uptake. Start with a duration that feels safe and repeatable." },
  { id: "c4", element: "C", kind: "carbon", position: [0.85, -0.43, 0.05], title: "Sleep repair", summary: "A lower ring point for recovery and overnight patterns.", advice: "Protect a consistent sleep window. Poor or fragmented sleep can affect hunger, insulin sensitivity, and next-day readings." },
  { id: "c5", element: "C", kind: "carbon", position: [-0.12, -1.02, -0.08], title: "Stress response", summary: "This atom tracks the nervous system side of metabolic care.", advice: "When stress is high, use a brief downshift that you can repeat: slow breathing, a pause outside, or a few minutes of gentle movement." },
  { id: "o5", element: "O", kind: "oxygen", position: [-1.08, -0.62, 0], title: "Hydration check", summary: "The ring oxygen is a cue to check the basics.", advice: "Keep water available through the day. Your clinician can advise if you need a specific fluid target or have kidney or heart considerations." },
  { id: "o1", element: "O", kind: "oxygen", position: [-2.22, 0.96, 0.12], title: "Read your data", summary: "An outer oxygen node for observation without judgment.", advice: "Look for patterns across several readings rather than reacting to one number. Bring recurring changes to your care team." },
  { id: "o2", element: "O", kind: "oxygen", position: [-0.65, 2.08, -0.08], title: "Plan ahead", summary: "A high node for preparation before the day gets busy.", advice: "A little planning helps: keep a suitable snack, medicines, and your monitoring supplies where you will actually use them." },
  { id: "o3", element: "O", kind: "oxygen", position: [1.64, 1.28, 0.08], title: "Portion awareness", summary: "This branch highlights the amount as well as the food.", advice: "Notice portion size and how it relates to your readings. Small, sustainable adjustments are more useful than rigid rules." },
  { id: "o4", element: "O", kind: "oxygen", position: [1.91, -0.91, -0.1], title: "Medication routine", summary: "A molecule needs its bonds; treatment needs consistency.", advice: "Take medications as prescribed and ask your clinician before changing doses. Use reminders that fit your daily routine." },
  { id: "o6", element: "O", kind: "oxygen", position: [0.07, -2.05, 0.09], title: "Review and adapt", summary: "The final branch points back to your clinical plan.", advice: "Keep notes on what changed before unusual readings. That context makes consultations more actionable." },
]

const bonds: [string, string][] = [
  ["c1", "c2"], ["c2", "c3"], ["c3", "c4"], ["c4", "c5"], ["c5", "o5"], ["o5", "c1"],
  ["c1", "o1"], ["c2", "o2"], ["c3", "o3"], ["c4", "o4"], ["c5", "o6"],
]

const colors: Record<AtomKind, string> = { carbon: "#37d7ff", oxygen: "#ff4fa3" }

function bondBetween(start: THREE.Vector3, end: THREE.Vector3) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5)
  const length = start.distanceTo(end)
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, length, 12),
    new THREE.MeshStandardMaterial({ color: "#a78bfa", emissive: "#5b21b6", emissiveIntensity: 0.7, roughness: 0.35 })
  )
  mesh.position.copy(midpoint)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize())
  return mesh
}

function GlucoseScene({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const mountRef = React.useRef<HTMLDivElement | null>(null)
  const selectedRef = React.useRef(selectedId)
  const selectRef = React.useRef(onSelect)

  React.useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  React.useEffect(() => { selectRef.current = onSelect }, [onSelect])

  React.useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0.4, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.minDistance = 4.8
    controls.maxDistance = 12
    controls.target.set(0, 0, 0)

    const molecule = new THREE.Group()
    molecule.rotation.x = -0.2
    scene.add(molecule)
    const pointById = new Map(atoms.map((atom) => [atom.id, new THREE.Vector3(...atom.position)]))
    bonds.forEach(([from, to]) => molecule.add(bondBetween(pointById.get(from)!, pointById.get(to)!)))

    const atomMeshes: THREE.Mesh[] = []
    atoms.forEach((atom) => {
      const material = new THREE.MeshPhysicalMaterial({ color: colors[atom.kind], emissive: colors[atom.kind], emissiveIntensity: 0.45, roughness: 0.18, metalness: 0.22, clearcoat: 0.65 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(atom.kind === "carbon" ? 0.36 : 0.29, 32, 24), material)
      mesh.position.set(...atom.position)
      mesh.userData.atomId = atom.id
      molecule.add(mesh)
      atomMeshes.push(mesh)
    })

    scene.add(new THREE.AmbientLight("#dbeafe", 1.1))
    const cyanLight = new THREE.PointLight("#22d3ee", 11, 16)
    cyanLight.position.set(-4, 3, 5)
    scene.add(cyanLight)
    const pinkLight = new THREE.PointLight("#f472b6", 8, 14)
    pinkLight.position.set(4, -2, 4)
    scene.add(pinkLight)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerDown: { x: number; y: number } | null = null
    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }
    const onPointerDown = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY } }
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) return
      setPointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(atomMeshes, false)[0]
      if (hit) selectRef.current(hit.object.userData.atomId as string)
    }
    const onPointerMove = (event: PointerEvent) => {
      setPointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(atomMeshes, false)[0]
      renderer.domElement.style.cursor = hit ? "pointer" : "grab"
    }
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown)
    renderer.domElement.addEventListener("pointerup", onPointerUp)
    renderer.domElement.addEventListener("pointermove", onPointerMove)
    window.addEventListener("resize", onResize)
    const clock = new THREE.Clock()
    let frameId = 0
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      molecule.rotation.z = Math.sin(elapsed * 0.35) * 0.04
      atomMeshes.forEach((mesh) => {
        const active = mesh.userData.atomId === selectedRef.current
        const scale = active ? 1.28 + Math.sin(elapsed * 3) * 0.06 : 1
        mesh.scale.setScalar(scale)
        ;(mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = active ? 1.5 : 0.45
      })
      controls.update()
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(frameId)
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      renderer.domElement.removeEventListener("pointerup", onPointerUp)
      renderer.domElement.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("resize", onResize)
      controls.dispose()
      atomMeshes.forEach((mesh) => { mesh.geometry.dispose(); ;(mesh.material as THREE.Material).dispose() })
      molecule.children.filter((child) => child instanceof THREE.Mesh && !(child as THREE.Mesh).userData.atomId).forEach((child) => {
        const mesh = child as THREE.Mesh
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0" aria-label="Interactive glucose molecule. Drag to rotate, scroll to zoom, and select an atom for care guidance." role="application" />
}

export default function Vitality3DPage() {
  const [selectedId, setSelectedId] = React.useState("c1")
  const selectedAtom = atoms.find((atom) => atom.id === selectedId) ?? atoms[0]

  return (
    <BaseLayout title="Glucose Molecule Explorer" description="Explore a rotating glucose molecule and select each atom for practical diabetes-care guidance.">
      <div className="@container/main px-4 py-6 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-2"><Link to="/models"><ArrowLeft className="h-4 w-4" /> Back to health tools</Link></Button>
        <section className="relative min-h-[720px] overflow-hidden border border-cyan-300/25 bg-[#070719] text-white shadow-[0_0_54px_rgba(34,211,238,0.13)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.17),transparent_28%),radial-gradient(circle_at_82%_70%,rgba(244,114,182,0.14),transparent_26%),linear-gradient(145deg,rgba(7,7,25,0.98),rgba(19,7,35,0.94))]" />
          <GlucoseScene selectedId={selectedId} onSelect={setSelectedId} />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-4 p-5 md:p-8">
            <Badge variant="outline" className="w-fit border-cyan-300/35 bg-cyan-300/10 text-cyan-100"><Atom className="mr-2 h-3.5 w-3.5" /> Interactive molecule</Badge>
            <div className="max-w-xl"><h1 className="text-4xl font-bold tracking-normal md:text-6xl">Glucose, made tangible.</h1><p className="mt-3 text-base leading-7 text-white/72 md:text-lg">Rotate the molecule, zoom in, then choose an atom for a practical care cue.</p></div>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-5 hidden items-center gap-4 text-xs text-white/55 md:flex"><span className="flex items-center gap-2"><Hand className="h-4 w-4" /> Drag to rotate</span><span className="flex items-center gap-2"><ZoomIn className="h-4 w-4" /> Scroll to zoom</span><span className="flex items-center gap-2"><Rotate3D className="h-4 w-4" /> Select an atom</span></div>

          <aside className="absolute bottom-5 right-5 w-[calc(100%-2.5rem)] border border-white/18 bg-[#0b1028]/90 p-5 shadow-2xl backdrop-blur-md sm:w-[360px] md:bottom-8 md:right-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: colors[selectedAtom.kind] }}>{selectedAtom.element} atom selected</p>
            <h2 className="mt-2 text-2xl font-semibold">{selectedAtom.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">{selectedAtom.summary}</p>
            <div className="mt-4 border-l-2 border-cyan-300/70 pl-4 text-sm leading-6 text-white/85">{selectedAtom.advice}</div>
            <p className="mt-4 text-xs leading-5 text-white/48"><CircleHelp className="mr-1 inline h-3.5 w-3.5" /> General education only. Discuss personal care decisions with your clinician.</p>
          </aside>
        </section>
      </div>
    </BaseLayout>
  )
}