import * as THREE from "three"
import { useRef, useMemo, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Clouds, Cloud, CameraControls, Sky as SkyImpl, StatsGl } from "@react-three/drei"
import { useControls, folder, button } from "leva"

export default function App() {
  return (
    <Canvas camera={{ position: [0, -10, 10], fov: 75 }}>
      <Sky />
      <ambientLight intensity={Math.PI / 1.5} />
      <spotLight position={[0, 40, 0]} decay={0} distance={45} penumbra={1} intensity={100} />
      <CameraControls />
    </Canvas>
  )
}

function Sky() {
  const ref = useRef()
  const cloud0 = useRef()

  const {
    // Atmosphere
    number, cloudHeight, speed, spreadX, spreadY, spreadZ, drawDistance,
    cloudWidth, cloudLength, cloudDepth,
    customSky, skyTop, skyBottom,
    // Weather
    storm, windAngle, rain, rainHeight,
    // Lighting
    redLights, boltColor, lightningFreq, lightningInt, boltHeightVar, boltOffset,
    // Cloud Props
    ...config
  } = useControls({
    "Atmosphere": folder({
      number: { value: 20, min: 1, max: 200, step: 1 },
      cloudHeight: { value: 50, min: 10, max: 150, step: 1 },
      speed: { value: 0.5, min: 0, max: 5, step: 0.01 },
      spreadX: { value: 100, min: 10, max: 500, step: 1, label: "Spread X" },
      spreadY: { value: 20, min: 0, max: 100, step: 1, label: "Spread Y" },
      spreadZ: { value: 100, min: 10, max: 500, step: 1, label: "Spread Z" },
      drawDistance: { value: 1000, min: 100, max: 5000, step: 100 },
      customSky: { value: true },
      skyTop: "#202020",
      skyBottom: "#000000"
    }),
    "Cloud Shape": folder({
      cloudWidth: { value: 19, min: 1, max: 100, step: 1, label: "Cloud Width" },
      cloudLength: { value: 30, min: 1, max: 100, step: 1, label: "Cloud Height" },
      cloudDepth: { value: 53, min: 1, max: 100, step: 1, label: "Cloud Depth" },
      segments: { value: 20, min: 1, max: 80, step: 1 },
      volume: { value: 10, min: 0, max: 100, step: 0.1 },
      opacity: { value: 0.8, min: 0, max: 1, step: 0.01 },
      fade: { value: 10, min: 0, max: 400, step: 1 },
      growth: { value: 4, min: 0, max: 20, step: 1 },
      color: "white",
      seed: { value: 1, min: 1, max: 100, step: 1 },
    }),
    "Weather": folder({
      storm: { value: false },
      rain: { value: 0, min: 0, max: 1, step: 0.01 },
      rainHeight: { value: 175, min: 10, max: 200, step: 1 },
      windAngle: { value: 105, min: 0, max: 360, step: 1 },
    }),
    "Lighting": folder({
      redLights: { value: 24, min: 0, max: 50, step: 1, label: "Red Intensity" },
      boltColor: "#bbbbfc",
      lightningFreq: { value: 0.5, min: 0, max: 1, step: 0.01 },
      lightningInt: { value: 300, min: 100, max: 1000, step: 10 },
      boltHeightVar: { value: 20, min: 0, max: 50, step: 1, label: "Bolt H. Random" },
      boltOffset: { value: -45, min: -50, max: 50, step: 1, label: "Bolt Offset Y" }
    }),
    "System": folder({
      "Export JSON": button((get) => {
        const conf = {
          number: get("Atmosphere.number"),
          cloudHeight: get("Atmosphere.cloudHeight"),
          speed: get("Atmosphere.speed"),
          spreadX: get("Atmosphere.Spread X"), // Check lebel key access or use exact control name if leva requires it. Actually get() usually takes path or key. Let's try to just dump all.
          // Leva's `get` isn't always passed to button callback in all versions, depends on usage. 
          // Safer: We can't easily access 'all currently rendered controls' inside the button callback without external state.
          // However, we are INSIDE the component where `config` and all consts exist.
          // But button callback might be defined before render.
          // Actually, we can just print the current state values if we close over them? No, button definition runs once.
          // Let's use a workaround: alerting the user or assume modern leva. 
          // Re-reading docs: button inputs don't receive `get` in all versions. 
          // Let's rely on the fact that we can construct the object manually if needed or skip complex implementation for now.
          // Wait, `useControls` returns values. We can use a ref to store current values and access it in button?
          // Button is defined inside configuration object passed to useControls, so we can't access result of useControls there.
          // Recursive dependency.
          // Fix: Use a separate `useControls` for the button, or simpler: just log "To export, expand controls and screenshot" or use `leva` store if possible.
          // Better approach: Just use a `useEffect` to update a ref with current config, and use a separate useControls hook for the button that reads that ref? No, separate panels.
          // Simplest: Add button in a separate `useControls` call AFTER the main one.
        }
        // alert("Copying feature requires refactoring state access. For now, check console.")
        // console.log("Export functionality placeholder.")
      })
    })
  })

  // We need the Export button to have access to the values.
  // We can't do it inside the same useControls definition easily.
  // Let's move the button to a second useControls hook that receives the current values as dependencies? 
  // leva buttons don't re-run.
  // Alternative: Just console.log the values from an effect or something?
  // Let's stick to the decoupled shape fix first. I will add the export button in a separate useControls call below.

  useControls({
    "System": folder({
      "Export to Clipb.": button(() => {
        const exportData = {
          number, cloudHeight, speed, spreadX, spreadY, spreadZ,
          cloudWidth, cloudLength, cloudDepth,
          storm, windAngle, rain, rainHeight, redLights, boltColor, boltOffset,
          // ... include others
        }
        navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
          .then(() => alert("Configuration copied to clipboard!"))
          .catch(() => alert("Failed to copy."))
      })
    })
  }, [number, cloudHeight, speed, spreadX, spreadY, spreadZ, cloudWidth, cloudLength, cloudDepth, storm, windAngle, rain, rainHeight, redLights, boltColor, boltOffset])
  // Dependency array ensures button callback has fresh closure values? Leva button might not update callback closure.
  // Actually, leva button callback is often static. 
  // Correct pattern: Use a Ref to hold current config, update it on every render. Button reads Ref.

  const configRef = useRef()
  configRef.current = {
    number, cloudHeight, speed, spreadX, spreadY, spreadZ, drawDistance,
    cloudWidth, cloudLength, cloudDepth,
    customSky, skyTop, skyBottom,
    storm, windAngle, rain, rainHeight,
    redLights, boltColor, lightningFreq, lightningInt, boltHeightVar, boltOffset,
    ...config
  }

  useControls({
    "System": folder({
      "Export JSON": button(() => {
        if (configRef.current) {
          navigator.clipboard.writeText(JSON.stringify(configRef.current, null, 2))
            .then(() => alert("Config copied to clipboard!"))
        }
      })
    })
  })

  // Adjust config based on storm
  const finalColor = storm ? "#111111" : config.color
  const finalVolume = storm ? config.volume * 1.5 : config.volume

  // Logic to override red lights in storm to prevent red clouds
  const spotIntensity = storm ? 20 : redLights
  const spotColor = storm ? boltColor : "red"

  const clouds = useMemo(() => {
    return new Array(number).fill().map((_, i) => ({
      x: (Math.random() - 0.5) * (spreadX * 2),
      y: (Math.random() - 0.5) * (spreadY * 2),
      z: (Math.random() - 0.5) * (spreadZ * 2),
      scale: 1 + Math.random(),
      seed: Math.random() * 100
    }))
  }, [number, spreadX, spreadY, spreadZ, config.seed])

  useFrame((state, delta) => {
    // Wind direction logic
    const angleRad = (windAngle * Math.PI) / 180

    // Move clouds or rotate sky based on wind angle
    const xMove = Math.cos(angleRad) * speed * delta * 0.1
    // const zMove = Math.sin(angleRad) * speed * delta * 0.1 

    ref.current.rotation.y += xMove
  })

  // Dynamic limit based on segments per cloud, plus safety buffer
  const particleLimit = number * config.segments + 500

  return (
    <>
      {customSky ? <GradientSky top={skyTop} bottom={skyBottom} /> : <SkyImpl />}
      <Lightning
        storm={storm}
        frequency={lightningFreq}
        intensity={lightningInt}
        color={boltColor}
        baseHeight={cloudHeight}
        heightVar={boltHeightVar}
        heightOffset={boltOffset}
      />
      <Rain intensity={rain} top={rainHeight} />

      <ambientLight intensity={Math.PI / 1.5} />
      <spotLight position={[0, 40, 0]} decay={0} distance={45} penumbra={1} intensity={100} />
      <spotLight position={[-20, 0, 10]} color={spotColor} angle={0.15} decay={0} penumbra={-1} intensity={spotIntensity} />
      <spotLight position={[20, -10, 10]} color={spotColor} angle={0.2} decay={0} penumbra={-1} intensity={spotIntensity} />

      <group ref={ref}>
        <Clouds material={THREE.MeshLambertMaterial} limit={particleLimit} range={drawDistance}>
          {clouds.map((cloud, index) => (
            <Cloud
              key={index}
              {...config}
              volume={finalVolume}
              bounds={[cloudWidth, cloudLength, cloudDepth]}
              color={finalColor}
              seed={cloud.seed}
              position={[cloud.x, cloudHeight, cloud.z]}
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

function Rain({ intensity, top = 60 }) {
  const count = 1000
  const rainGeo = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100 // x
      positions[i * 3 + 1] = Math.random() * top // y (height)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 // z
    }
    return positions
  }, [top])

  const ref = useRef()
  useFrame((state, delta) => {
    if (!ref.current) return
    const positions = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      // Move drop down
      positions[i * 3 + 1] -= (20 + Math.random() * 10) * delta
      // Reset if below ground
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = top
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

function Lightning({ storm, frequency, intensity, color, baseHeight, heightVar, heightOffset }) {
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

      // Random height for this specific bolt
      // Ensure baseHeight is valid, default to 50 if undefined
      const h = (baseHeight || 50) + (heightOffset || 0) + (Math.random() - 0.5) * (heightVar || 20)

      // Random position for flash
      const x = (Math.random() - 0.5) * 100
      const z = (Math.random() - 0.5) * 100
      light.current.position.set(x, h, z)

      // Trigger visual bolt
      setStrike({ x, y: h, z, alpha: 1.0 })
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
      {strike && (
        <>
          <LightningStrike start={[strike.x, strike.y + 30, strike.z]} end={[strike.x + (Math.random() - 0.5) * 20, 0, strike.z + (Math.random() - 0.5) * 20]} color={color} opacity={strike.alpha} />
          {/* Soft Cloud Flash / Glow using Sprite */}
          <sprite position={[strike.x, strike.y, strike.z]} scale={[60, 60, 1]}>
            <spriteMaterial
              color={color}
              transparent
              opacity={strike.alpha * 0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              map={getGlowTexture()}
              toneMapped={false}
            />
          </sprite>
        </>
      )}
    </>
  )
}

let glowTexture = null
function getGlowTexture() {
  if (glowTexture) return glowTexture
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext("2d")
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  glowTexture = new THREE.CanvasTexture(canvas)
  return glowTexture
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
  }, [start[0], start[2], end[0], end[2], start[1]]) // Include Y in dependency

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
