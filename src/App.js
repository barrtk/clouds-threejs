import * as THREE from "three"
import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Clouds, Cloud, CameraControls, Sky as SkyImpl, StatsGl } from "@react-three/drei"
import { useControls } from "leva"

export default function App() {
  return (
    <Canvas camera={{ position: [0, -10, 10], fov: 75 }}>
      <Sky />
      <ambientLight intensity={Math.PI / 1.5} />
      <spotLight position={[0, 40, 0]} decay={0} distance={45} penumbra={1} intensity={100} />
      <spotLight position={[-20, 0, 10]} color="red" angle={0.15} decay={0} penumbra={-1} intensity={30} />
      <spotLight position={[20, -10, 10]} color="red" angle={0.2} decay={0} penumbra={-1} intensity={20} />
      <CameraControls />
    </Canvas>
  )
}


function Sky() {
  const ref = useRef()
  const cloud0 = useRef()
  const { number, speed, color, x, y, z, range, ...config } = useControls({
    number: { value: 20, min: 1, max: 100, step: 1 },
    seed: { value: 1, min: 1, max: 100, step: 1 },
    segments: { value: 20, min: 1, max: 80, step: 1 },
    volume: { value: 10, min: 0, max: 100, step: 0.1 },
    opacity: { value: 0.8, min: 0, max: 1, step: 0.01 },
    fade: { value: 10, min: 0, max: 400, step: 1 },
    growth: { value: 4, min: 0, max: 20, step: 1 },
    speed: { value: 0.1, min: 0, max: 1, step: 0.01 },
    x: { value: 50, min: 0, max: 100, step: 1 },
    y: { value: 20, min: 0, max: 100, step: 1 },
    z: { value: 50, min: 0, max: 100, step: 1 },
    color: "white",
  })

  const clouds = useMemo(() => {
    return new Array(number).fill().map((_, i) => ({
      x: (Math.random() - 0.5) * (x * 2),
      y: (Math.random() - 0.5) * (y * 2),
      z: (Math.random() - 0.5) * (z * 2),
      scale: 1 + Math.random(),
      seed: Math.random() * 100
    }))
  }, [number, x, y, z, config.seed]) // Regenerate when number/bounds/seed changes at parent level

  useFrame((state, delta) => {
    // Gentle rotation for wind simulation controlled by speed
    ref.current.rotation.y += delta * speed * 0.1
  })

  return (
    <>
      <SkyImpl />
      <group ref={ref}>
        {/* Increased range and bounds to cover the sky */}
        <Clouds material={THREE.MeshLambertMaterial} limit={400} range={range}>
          {clouds.map((cloud, index) => (
            <Cloud
              key={index}
              {...config}
              bounds={[x, y, z]}
              color={color}
              seed={cloud.seed}
              position={[cloud.x, 50, cloud.z]} // Keep height relatively constant but random X/Z
            />
          ))}
        </Clouds>
      </group>
    </>
  )
}
