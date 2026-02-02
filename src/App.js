import * as THREE from "three"
import { useRef, useMemo, useState } from "react"
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
  const { number, speed, color, x, y, z, range, windAngle, rain, storm, redLights, lightningFreq, lightningInt, boltColor, skyTop, skyBottom, customSky, ...config } = useControls({
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
    windAngle: { value: 0, min: 0, max: 360, step: 1 },
    rain: { value: 0, min: 0, max: 1, step: 0.01 },
    storm: { value: false },
    redLights: { value: 0, min: 0, max: 50, step: 1 },
    lightningFreq: { value: 0.5, min: 0, max: 1, step: 0.01 },
    lightningInt: { value: 300, min: 100, max: 1000, step: 10 },
    boltColor: "#ccccff",
    customSky: { value: true },
    skyTop: "#202020",
    skyBottom: "#000000"
  })

  // Adjust config based on storm
  const finalColor = storm ? "#111111" : color // Darker clouds in storm
  const finalVolume = storm ? config.volume * 1.5 : config.volume

  // Logic to override red lights in storm to prevent red clouds
  const spotIntensity = storm ? 20 : redLights
  const spotColor = storm ? boltColor : "red"

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
    // Wind direction logic
    const angleRad = (windAngle * Math.PI) / 180
    // Move clouds or rotate sky based on wind angle
    // Using rotation for simplicity as per previous code, but directional
    const xMove = Math.cos(angleRad) * speed * delta * 0.1
    const zMove = Math.sin(angleRad) * speed * delta * 0.1

    ref.current.rotation.y += xMove // Rotate the whole group
    // Ideally we would move individual clouds, but group rotation is cheaper and was requested
  })

  return (
    <>
      {customSky ? <GradientSky top={skyTop} bottom={skyBottom} /> : <SkyImpl />}
      <Lightning storm={storm} frequency={lightningFreq} intensity={lightningInt} color={boltColor} />
      <Rain intensity={rain} />

      <ambientLight intensity={Math.PI / 1.5} />
      <spotLight position={[0, 40, 0]} decay={0} distance={45} penumbra={1} intensity={100} />
      <spotLight position={[-20, 0, 10]} color={spotColor} angle={0.15} decay={0} penumbra={-1} intensity={spotIntensity} />
      <spotLight position={[20, -10, 10]} color={spotColor} angle={0.2} decay={0} penumbra={-1} intensity={spotIntensity} />

      <group ref={ref}>
        {/* Increased range and bounds to cover the sky */}
        <Clouds material={THREE.MeshLambertMaterial} limit={400} range={range}>
          {clouds.map((cloud, index) => (
            <Cloud
              key={index}
              {...config}
              volume={finalVolume}
              bounds={[x, y, z]}
              color={finalColor}
              seed={cloud.seed}
              position={[cloud.x, 50, cloud.z]}
            />
          ))}
        </Clouds>
      </group>
    </>
  )
}

function GradientSky({ top, bottom }) {
  return (
    <mesh scale={[200, 200, 200]}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={{
          uTop: { value: new THREE.Color(top) },
          uBottom: { value: new THREE.Color(bottom) }
        }}
        vertexShader={`
                    varying vec3 vWorldPosition;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = normalize(worldPosition.xyz);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
        fragmentShader={`
                    uniform vec3 uTop;
                    uniform vec3 uBottom;
                    varying vec3 vWorldPosition;
                    void main() {
                        float h = normalize(vWorldPosition + 1.0).y;
                        gl_FragColor = vec4(mix(uBottom, uTop, max(0.0, vWorldPosition.y * 0.5 + 0.5)), 1.0);
                    }
                `}
      />
    </mesh>
  )
}

function Rain({ intensity }) {
  const count = 1000
  const rainGeo = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100 // x
      positions[i * 3 + 1] = Math.random() * 60 // y (height)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 // z
    }
    return positions
  }, [])

  const ref = useRef()
  useFrame((state, delta) => {
    if (!ref.current) return
    const positions = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      // Move drop down
      positions[i * 3 + 1] -= (20 + Math.random() * 10) * delta
      // Reset if below ground
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 60
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (intensity <= 0) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          itemSize={3}
          array={rainGeo}
        />
      </bufferGeometry>
      <pointsMaterial color="#aaaaaa" size={0.2} transparent opacity={intensity} />
    </points>
  )
}

function Lightning({ storm, frequency, intensity, color }) {
  const light = useRef()
  const [strike, setStrike] = useState(null)

  useFrame((state) => {
    if (!storm || !light.current) {
      if (strike) setStrike(null)
      return
    }
    // Random chance to flash based on frequency
    const threshold = 0.995 - (frequency * 0.05)
    if (Math.random() > threshold) {
      const power = intensity + Math.random() * 200
      light.current.intensity = power

      // Random position for flash
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      light.current.position.set(x, 50, z)

      // Trigger visual bolt
      setStrike({ x, z, alpha: 1.0 })
    } else {
      // Fade out
      light.current.intensity = Math.max(0, light.current.intensity - 20)
      if (strike) {
        const newAlpha = strike.alpha - 0.1
        if (newAlpha <= 0) setStrike(null)
        else setStrike({ ...strike, alpha: newAlpha })
      }
    }
  })

  return (
    <>
      <pointLight ref={light} position={[0, 100, 0]} intensity={0} distance={200} color={color} toneMapped={false} />
      {strike && <LightningStrike start={[strike.x, 80, strike.z]} end={[strike.x + (Math.random() - 0.5) * 20, 0, strike.z + (Math.random() - 0.5) * 20]} color={color} opacity={strike.alpha} />}
    </>
  )
}

function LightningStrike({ start, end, color, opacity }) {
  const points = useMemo(() => {
    // Generate random jagged points between start and end
    const pts = []
    const segments = 10
    const vecStart = new THREE.Vector3(...start)
    const vecEnd = new THREE.Vector3(...end)

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const pos = new THREE.Vector3().lerpVectors(vecStart, vecEnd, t)
      if (i > 0 && i < segments) {
        pos.x += (Math.random() - 0.5) * 2 // Jitter
        pos.z += (Math.random() - 0.5) * 2
      }
      pts.push(pos)
    }
    return pts
  }, [start[0], start[2], end[0], end[2]]) // Re-generate only on new coordinates

  // Convert Vector3[] to a structure compatible with Line
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={2} />
    </line>
  )
}
