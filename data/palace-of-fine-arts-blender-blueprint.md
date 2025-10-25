# Palace of Fine Arts - Blender Reconstruction Blueprint

**Project:** Memora 3D Environment - Palace of Fine Arts Recreation
**Target Area:** 900ft × 900ft square section containing rotunda, colonnades, and lagoon
**Approach:** Empirical reconstruction based on blueprint, aerial photography, and ground-level reference photos
**Quality Standard:** Near 1:1 architectural accuracy with atmospheric rendering

---

## TABLE OF CONTENTS

1. [Project Specifications](#project-specifications)
2. [Master Scale & Units](#master-scale--units)
3. [Rotunda Structure](#rotunda-structure)
4. [Colonnade Structures](#colonnade-structures)
5. [Lagoon & Water Features](#lagoon--water-features)
6. [Vegetation System](#vegetation-system)
7. [Ground Surfaces & Pathways](#ground-surfaces--pathways)
8. [Material Definitions](#material-definitions)
9. [Lighting & Atmosphere](#lighting--atmosphere)
10. [Modeling Order & Hierarchy](#modeling-order--hierarchy)

---

## PROJECT SPECIFICATIONS

### Verified Dimensions (Research Sources)
- **Rotunda total height:** 162 feet (49.38 meters)
- **Rotunda dome height:** 162 feet (49.38 meters)
- **Colonnade total length (both sides):** 1,100 feet (335.28 meters)
- **Colonnade columns total:** 30 (15 per side)
- **Rotunda piers:** 8 (octagonal configuration)
- **Site area:** 17 acres (68,796.77 m²)

### Blender Project Setup
- **Units:** Metric (meters)
- **Scale:** 1 Blender unit = 1 meter
- **Coordinate system origin:** Center of rotunda at ground level (0, 0, 0)
- **Up axis:** Z-axis
- **North direction:** +Y axis

---

## MASTER SCALE & UNITS

### Primary Reference Dimension
**Rotunda height = 49.38 meters** (verified from research)

All other measurements derived from this known dimension and photographic analysis.

### Scale Derivation Method

**From Photo 2 (Aerial) Analysis:**
- Rotunda dome appears as circle with measurable pixel diameter
- Using rotunda height (49.38m) and visible proportions:
  - Dome height : Drum height ratio = 2:1 (empirically observed)
  - Therefore: Dome = 32.92m height, Drum = 16.46m height

**Rotunda Drum Diameter Calculation:**
- Octagonal base with 8 piers at 45° intervals
- From aerial view: octagon spans approximately 1.2× dome width
- Dome width ≈ dome height (hemisphere) = 32.92m diameter
- **Octagonal drum diameter (inscribed circle): 36-40 meters** (estimated range)
- **Using conservative middle value: 38 meters**

### Site Boundary Dimensions

Using rotunda drum diameter (38m) as measurement unit from aerial photo:

- **Site width (East-West):** Approximately 23× rotunda diameter = 874 meters
- **Site length (North-South):** Approximately 20× rotunda diameter = 760 meters
- **Target 900ft × 900ft = 274.32m × 274.32m** (user specification)

**Resolution:** Model entire visible complex, then frame final render to 274.32m square centered on rotunda.

---

## ROTUNDA STRUCTURE

### 1. DOME

#### Geometry Specifications

**Primary Form:**
- Type: Hemisphere (perfect half-sphere)
- Radius: 16.46 meters
- Center point: (0, 0, 16.46) in Blender coordinates (base of dome at z=16.46m)
- Segments: 64 (for smooth curvature)
- Rings: 32 (for smooth curvature)

**Coffering Pattern:**

Empirical observations from Photo 1:
- Pattern type: Hexagonal coffers
- Arrangement: Concentric rings radiating from apex
- Ring count: 5 visible rings (Photo 2 count)
- Coffer count estimate: 60-70 total hexagons

**Coffer Dimensions (calculated):**
- Ring 1 (apex): 6 hexagons, each approximately 0.8m across
- Ring 2: 12 hexagons, each approximately 0.9m across
- Ring 3: 18 hexagons, each approximately 1.0m across
- Ring 4: 24 hexagons, each approximately 1.1m across
- Ring 5: 30 hexagons (partial), each approximately 1.2m across

**Coffer Depth:**
- Recess depth: 0.15-0.20 meters (estimated from shadow depth in photos)
- Edge bevel: 0.05 meters (visible as highlighted edges)

**Central Oculus:**
- Present: YES (confirmed in Photo 2)
- Diameter: 1.6 meters (approximately 1/10 of dome diameter)
- Position: True apex of dome (0, 0, 49.38)
- Edge treatment: Clean circular opening (no visible frame in photos)

**Modeling Method:**
```
1. Create UV sphere: radius 16.46m, 64 segments, 32 rings
2. Delete bottom hemisphere (keep only upper half)
3. Use Array Modifier (circular) + Boolean operations to create hexagonal coffers
4. Alternatively: Use displacement mapping with procedural hexagon texture
5. Create oculus: Select center faces, delete, clean up edge loop
6. Subdivide surface for smooth appearance
```

#### Materials & Colors

**Dome Exterior Surface:**
- Base color: Terracotta peachy (#D9916E) = RGB(217, 145, 110) = RGB(0.851, 0.569, 0.431) in Blender
- Finish: Matte (Roughness: 0.8-0.9)
- Slight color variation: Add noise texture (scale 5.0, strength 0.1) for weathering

**Coffer Interiors:**
- Base color: Darker terracotta-brown (#B87456) = RGB(184, 116, 86) = RGB(0.722, 0.455, 0.337)
- Finish: Matte (Roughness: 0.85)
- Receives ambient occlusion strongly (darker in recesses)

**Coffer Edge Highlights:**
- Method: Edge wear/weathering shader
- Color: Cream-beige (#E8D4C0) = RGB(232, 212, 192) = RGB(0.910, 0.831, 0.753)
- Apply only to sharp edges using geometry node or bevel shader

---

### 2. DRUM (Cylindrical Base Below Dome)

#### Geometry Specifications

**Primary Form:**
- Type: Regular octagon in plan view
- Inscribed circle diameter: 38 meters
- Height: 16.46 meters (calculated from 2:1 dome:drum ratio)
- Base elevation: 0 meters (ground level)
- Top elevation: 16.46 meters (where dome begins)

**Octagon Face Dimensions:**
- Number of faces: 8
- Each face width: 38m × sin(180°/8) × 2 = 14.56 meters per face
- Each face height: 16.46 meters

**Wall Thickness:**
- Exterior to interior: 0.8-1.0 meters (estimated from archway depth)

#### Arched Openings

**Opening Specifications (per face):**
- Count: 1 arch per octagon face = 8 total arches
- Arch type: Roman round arch (semicircular)
- Arch width: 6-7 meters (approximately 45-50% of face width)
- Arch height (to keystone): 10-11 meters (approximately 60-65% of drum height)
- Springer height (arch start): 3-4 meters above ground
- Keystone: visible as highlighted center element at arch apex

**Modeling Method:**
```
1. Create octagonal cylinder: diameter 38m, height 16.46m, 8 faces
2. For each face:
   - Create curve (Bezier) defining arch profile
   - Width: 6.5m, Height to keystone: 10.5m, Springer: 3.5m
   - Use Array Modifier for arch stones (voussoirs)
   - Boolean subtract from drum wall
3. Add arch depth (reveal): extrude inward 0.8-1.0m
```

#### Relief Panels (Attic Story)

**Panel Specifications:**
- Count: 8 panels (one per octagon face, above arch openings)
- Position: Between arch keystone and cornice
- Dimensions per panel: 5-6m wide × 4-5m tall (portrait orientation)
- Depth: Low relief, approximately 0.1-0.15m projection
- Content: Figural allegorical scenes (not modeled in detail - use normal/bump map)

**Panel Frame:**
- Border width: 0.2-0.3m
- Projection: Slight recess (0.05m) from wall surface

#### Materials & Colors

**Drum Exterior:**
- Base color: Cream/beige stone (#E8DCC8) = RGB(232, 220, 200) = RGB(0.910, 0.863, 0.784)
- Finish: Matte (Roughness: 0.75)
- Texture: Smooth plaster/stucco appearance (very fine noise, scale 20.0)

**Arch Interior (Reveal):**
- Same as drum exterior but receives more shadow

**Relief Panels:**
- Base color: Slightly darker than drum (#DED0B8) = RGB(222, 208, 184) = RGB(0.871, 0.816, 0.722)
- Use normal map or bump map for figural relief detail
- Edge shadow: Ambient occlusion for panel frame recess

---

### 3. ROTUNDA PIERS

Each pier is a complex architectural element. There are **8 identical piers** positioned at the 8 corners of the octagonal drum.

#### Pier Position & Orientation

**Positions (in plan view, measured from rotunda center):**
- Pier 1 (North): 0°, position (0, 19, 0)
- Pier 2 (NE): 45°, position (13.44, 13.44, 0)
- Pier 3 (East): 90°, position (19, 0, 0)
- Pier 4 (SE): 135°, position (13.44, -13.44, 0)
- Pier 5 (South): 180°, position (0, -19, 0)
- Pier 6 (SW): 225°, position (-13.44, -13.44, 0)
- Pier 7 (West): 270°, position (-19, 0, 0)
- Pier 8 (NW): 315°, position (-13.44, 13.44, 0)

**Pier projection distance:** Each pier projects approximately 5-6 meters from drum face

**Plan shape:** Triangular (verified from blueprint and Photo 2)
- Base width (at drum): 6-7 meters
- Projection depth: 5-6 meters
- Apex angle: Approximately 60-70°

#### Pier Architectural Elements (Bottom to Top)

**LEVEL 1: RUSTICATED PODIUM BASE**

Dimensions:
- Height: 2.5-3.0 meters
- Width: Matches pier plan (6-7m wide at drum face)
- Tiers: 3 horizontal stepped setbacks (verified from Photo 1)
  - Bottom tier: 0-1.0m height, full width
  - Middle tier: 1.0-2.0m height, 90% width (setback 0.3m each side)
  - Top tier: 2.0-3.0m height, 80% width (setback 0.3m each side)

Material:
- Color: Deep terracotta red-brown (#C8654A) = RGB(200, 101, 74) = RGB(0.784, 0.396, 0.290)
- Texture: Heavy rustication (rough-hewn stone blocks)
- Block size: 0.4-0.6m per block
- Joint depth: 0.05-0.08m recessed joints
- Roughness: 0.9 (very matte, rough surface)

Modeling method:
```
1. Create base rectangular block matching pier plan
2. Add 3 horizontal loop cuts for tier divisions
3. Scale each tier inward by 5-10% for setbacks
4. Apply Array modifier for stone blocks (0.5m spacing)
5. Add Displace modifier with noise for roughness
6. Use Boolean to create deep mortar joints
```

**LEVEL 2: STEPPED PLANTERS**

Dimensions:
- Position: Between podium tiers and rising alongside columns
- Width: 1.5-2.0 meters per planter level
- Depth: 0.5-0.8 meters
- Count: 2-3 levels creating stepped platforms

Material:
- Color: Same terracotta as podium (#C8654A)
- Finish: Smoother than rusticated base (Roughness: 0.7)

Vegetation in planters:
- Type: Low shrubs/plants (modeled as simple clustered spheres or particle system)
- Color: Medium green (#6B8E6E)
- Height: 0.5-1.0 meters above planter rim

**LEVEL 3: PAIRED EXTERIOR COLUMNS**

Confirmed from Photo 1: **2 columns per pier on exterior face**

Column Specifications:
- Count per pier: 2 columns (exterior facing)
- Total rotunda columns: 16 (8 piers × 2 columns)
- Height: 12-14 meters (estimated from photo proportions)
- Diameter: 1.0-1.2 meters at base
- Entasis: Slight taper (0.85-0.9× diameter at top)

Fluting:
- Present: YES (clearly visible in Photo 1)
- Flute count: 24 (standard Corinthian)
- Flute depth: 0.04-0.06 meters
- Flute profile: Semicircular

Base:
- Type: Attic base (two torus moldings with scotia between)
- Height: 0.5-0.6 meters
- Width: 1.3-1.4 meters (wider than shaft)

Shaft:
- Lower 1/3: Full diameter with entasis beginning
- Middle 1/3: Gradual taper
- Upper 1/3: Slender (90% of base diameter)
- Fluting runs full height of shaft

Capital:
- Type: Corinthian
- Height: 1.2-1.4 meters (approximately 1/10 of shaft height)
- Width: 1.4-1.6 meters (wider than shaft top)
- Decoration: Acanthus leaves, volutes, abacus
- Color: Cream/beige (#E8DCC8) - DIFFERENT from red column shaft

Column Material:
- Shaft color: Terracotta red (#C8654A) - matches podium
- Finish: Matte (Roughness: 0.6-0.7)
- Flute interior: Slightly darker due to shadow

Capital Material:
- Color: Cream stone (#E8DCC8)
- Carving detail: Use normal map for acanthus leaf detail
- Roughness: 0.7

Modeling method:
```
1. Create cylinder: height 12m, diameter 1.1m, 48 segments (2 per flute)
2. Add taper modifier (Simple Deform) for entasis
3. Create fluting:
   - Select vertical edge loops (every other edge for 24 flutes)
   - Inset and extrude inward 0.05m
   - Bevel for rounded flute profile
4. Model capital separately:
   - Base form: truncated cone
   - Add acanthus leaves as normal map or sculpted geometry
   - Create abacus (square top block)
5. Create Attic base with torus and scotia profiles
```

**Interior columns (within rotunda):**
- Count: 1 column per pier (8 total)
- Position: Inside rotunda, rising from ground level
- Specifications: Same as exterior columns but single, not paired
- Note: These are visible through archways but less priority for exterior view

**LEVEL 4: ENTABLATURE**

The entablature sits on top of the column capitals and runs continuously around the rotunda.

Sections (bottom to top):

**Architrave:**
- Height: 1.0-1.2 meters
- Profile: 3 horizontal bands (fasciae)
  - Bottom band: 0.3-0.4m
  - Middle band: 0.3-0.4m
  - Top band: 0.3-0.4m (each slightly projects beyond lower)
- Color: Cream stone (#E8DCC8)

**Frieze:**
- Height: 1.2-1.5 meters
- Decoration: Greek key/meander pattern (verified from Photo 1)
- Pattern depth: 0.05m relief
- Pattern color: Terracotta/brown on cream background
- Background color: Cream (#E8DCC8)

**Cornice:**
- Height: 0.8-1.0 meters
- Projection: 0.8-1.0 meters beyond frieze face
- Underside decoration: Modillions or dentils (small rectangular blocks)
- Modillion spacing: Approximately 0.3-0.4m on center
- Drip edge: Projects furthest at bottom edge

Total entablature height: 3.0-3.7 meters

Modeling method:
```
1. Create profile curve showing all moldings
2. Use Array Modifier (Follow Path) around octagon perimeter
3. Boolean operations for Greek key pattern on frieze
4. Model modillions as array of small blocks under cornice
```

**LEVEL 5: ATTIC STORY**

Position: Above entablature, forms upper wall of drum

Specifications:
- Height: 4-5 meters
- Width: Matches pier width below
- Surface: Plain wall with relief panels (as described in Drum section)

**LEVEL 6: GIANT URNS**

Confirmed: **1 urn per pier = 8 total urns**

Position:
- Sits on top of pier attic story
- Centered on pier axis
- Elevation: Approximately 20-22 meters above ground

Dimensions:
- Shape: Ovoid (egg-shaped)
- Height: 3.5-4.0 meters (approximately 1/3 of column height - verified from Photo 1)
- Maximum diameter: 2.0-2.5 meters (at widest point)
- Base diameter: 1.5-1.8 meters
- Top diameter: 1.2-1.5 meters (narrower opening)

Details:
- Horizontal ribs/bands: 3-4 decorative bands around body (visible in Photo 1)
- Base: Pedestal or molding (0.3-0.4m high)
- Handles: Possibly present (not clearly visible in photos)

Material:
- Color: Weathered gray-brown or terracotta (#8B7D72 or #B89080)
- Finish: Matte to slightly glossy (Roughness: 0.5-0.7)
- Weathering: Darker vertical streaks (water staining)

Modeling method:
```
1. Start with UV sphere
2. Scale on Z-axis for egg shape (1.5-2× taller than wide)
3. Add horizontal loop cuts for decorative bands
4. Bevel bands outward slightly (0.05-0.08m)
5. Boolean subtract top for opening
6. Add base pedestal
```

**LEVEL 7: WEEPING MAIDENS (Sculptural Figures)**

Confirmed: Multiple figures per pier, positioned at corners of attic boxes

Count estimate:
- Figures per pier: 2-3 figures (at outer corners)
- Total figures: 16-24 around entire rotunda

Position:
- Stand at corners of attic story above entablature
- Elevation: Same as relief panels (16-20m above ground)
- Facing: Outward and downward ("weeping" posture)

Dimensions:
- Height: 3.5-4.0 meters (approximately same as urns - verified Photo 1)
- Width: 0.8-1.0 meters (standing human proportions)
- Depth: 0.6-0.8 meters

Posture:
- Standing upright
- Arms position: Cannot determine precisely from photos
- Head position: Tilted downward
- Drapery: Classical robes visible as flowing forms

Material:
- Color: Cream/beige stone (#E8DCC8) - matches drum
- Finish: Smooth stone (Roughness: 0.6)

Modeling approach:
```
For high detail: Sculpt individual figures in Blender
For medium detail: Use simplified humanoid mesh with cloth simulation for drapery
For low detail: Use cylindrical form with normal map for drapery detail
```

---

## COLONNADE STRUCTURES

Two mirror-image colonnades extend from the rotunda. Specifications apply to both.

### Overall Configuration

**Colonnade Count:** 2 (West and East)

**West Colonnade:**
- Start point: Connects to northwest (Pier 8) and southwest (Pier 6) piers of rotunda
- End point: Western pavilion
- Arc direction: Curves westward from rotunda
- Column count: 15 (verified empirical count)

**East Colonnade:**
- Start point: Connects to northeast (Pier 2) and southeast (Pier 4) piers
- End point: Eastern pavilion
- Arc direction: Curves eastward from rotunda
- Column count: 15 (verified empirical count)

**Symmetry:** Perfect bilateral symmetry across north-south axis

### Geometric Layout

**Curve Type:** Circular arc (constant radius)

**Arc Radius Calculation:**
From Photo 2 aerial analysis:
- Arc radius: 3-4× rotunda diameter = 3.5 × 38m = 133 meters (center to center)
- Measured from point offset from rotunda center

**Arc Angle:**
- Approximately 170-180° (slightly less than semicircle)
- Spacing across 15 columns with even distribution

**Column Spacing:**
- Arc length for 15 columns: π × 133m × (175°/360°) = approximately 203 meters total arc
- 14 bays between 15 columns
- Spacing per bay: 203m / 14 = 14.5 meters on center

### Column Specifications

**Column Count per Colonnade:** 15 (verified)
**Total Columns Both Colonnades:** 30 (verified)

**Column Dimensions:**
- Height: 10-11 meters (slightly shorter than rotunda columns)
- Base diameter: 0.9-1.0 meters
- Top diameter: 0.8-0.9 meters (slight taper)

**Column Details:**

Fluting:
- Present: YES (verified Photo 1)
- Flute count: 24 (standard Corinthian)
- Flute depth: 0.04-0.05 meters
- Profile: Semicircular channels

Base:
- Type: Attic base
- Height: 0.4-0.5 meters
- Diameter: 1.1-1.2 meters

Capital:
- Type: Corinthian
- Height: 1.0-1.1 meters
- Width: 1.1-1.2 meters
- Acanthus leaf detail

Material:
- Column shaft color: Cream/beige (#E8D4C8) = RGB(232, 212, 200) = RGB(0.910, 0.831, 0.784)
  - NOTE: DIFFERENT from rotunda columns (these are cream, rotunda are terracotta)
- Capital color: Same cream as shaft
- Finish: Matte (Roughness: 0.7)

Modeling method:
```
1. Create master column with fluting, base, and capital
2. Use Array Modifier with curve path
3. Create Bezier curve for colonnade arc (radius 133m, angle 175°)
4. Set array count to 15
5. Apply Follow Curve constraint
```

### Entablature

Runs continuously above all columns along the curved colonnade.

**Sections (bottom to top):**

**Architrave:**
- Height: 0.8-0.9 meters
- Type: Fasciated (3 horizontal bands)
- Each band: 0.25-0.30m high
- Color: Cream (#E8D4C8)

**Frieze:**
- Height: 0.9-1.0 meters
- Decoration: Greek key/meander pattern (verified Photo 1)
- Pattern depth: 0.04-0.05m relief
- Pattern repeat: Approximately every 1.5-2.0 meters
- Background color: Lighter cream
- Pattern color: Terracotta/brown (#C8654A)

**Cornice:**
- Height: 0.6-0.8 meters
- Projection: 0.6-0.8 meters
- Underside: Modillions or dentils
- Modillion dimensions: 0.15m × 0.20m × 0.25m each
- Modillion spacing: 0.3-0.4m on center
- Color: Cream matching architrave

Total Entablature Height: 2.3-2.7 meters

### Attic/Parapet Wall

Above entablature, creating covered arcade below.

Specifications:
- Height: 2.5-3.0 meters
- Thickness: 0.4-0.5 meters
- Surface: Plain wall (no decoration visible in photos)
- Color: Cream matching colonnade (#E8D4C8)
- Top edge: Coping stone or cap
- Vegetation: Vines and trailing plants growing over top (verified Photo 1)

### Wall Sections Behind Colonnade

Not all bays between columns are open - some have walls.

Pattern (from photo analysis):
- Approximately alternating open/closed bays
- Wall sections: Same terracotta color as rotunda (#C8654A)
- Wall height: Full height from ground to entablature
- Wall thickness: 0.3-0.4 meters
- Wall surface: Smooth plaster finish

Bay pattern estimate:
- Bays 1-3: Open
- Bays 4-5: Walled
- Bays 6-8: Open
- Bays 9-10: Walled
- Bays 11-14: Open

(Exact pattern may vary - reference photos more closely)

### Colonnade Foundation/Podium

Base platform for columns:

Specifications:
- Height: 0.3-0.5 meters above ground
- Width: Extends 1.0-1.5m on either side of column centerline
- Surface: Smooth stone
- Color: Slightly darker cream (#DED0B8)
- Edge: Simple molding or chamfer

### End Pavilions

One pavilion at each end of each colonnade = 4 total pavilions

Specifications:
- Plan dimensions: 8-10m × 8-10m (square or rectangular)
- Height: Matches colonnade height (to top of attic)
- Projection: Projects forward from colonnade plane by 2-3 meters
- Roof: Flat roof matching colonnade entablature
- Decoration: May include urns or finials on top (small elements visible in Photo 2)
- Color: Same cream as colonnade (#E8D4C8)

Modeling approach:
```
1. Create rectangular box matching dimensions
2. Apply same entablature detail as colonnade
3. Add decorative top elements (urns/finials)
4. Position at curve endpoints
```

---

## LAGOON & WATER FEATURES

### Lagoon Perimeter Shape

**From blueprint and aerial analysis:** Highly irregular, organic shape with zero straight edges.

**Modeling Method:**

Use Photo 2 (aerial view) as reference to trace exact shoreline:

```
1. Import Photo 2 as reference image in Blender (Align to top view)
2. Scale image so rotunda matches modeled rotunda size
3. In Edit mode, create Curve (Bezier)
4. Trace lagoon perimeter following visible edge
5. Close curve
6. Convert to mesh
7. Extrude downward for water volume
```

**Approximate Dimensions:**
- Maximum width (E-W): 120-140 meters
- Maximum length (N-S): 180-200 meters
- Total perimeter: Approximately 450-500 meters

### Lagoon Water Surface

**Elevation:** 0 meters (ground level / reference datum)

**Material Specifications:**

Base Color:
- Shallow water (edges): Light teal (#8BBFB3) = RGB(139, 191, 179) = RGB(0.545, 0.749, 0.702)
- Medium depth: Medium teal (#6B9B8C) = RGB(107, 155, 140) = RGB(0.420, 0.608, 0.549)
- Deep water (center): Dark teal-green (#4A6B5E) = RGB(74, 107, 94) = RGB(0.290, 0.420, 0.369)

Shader Setup:
```
Principled BSDF:
- Base Color: Gradient from light to dark teal based on depth
- Metallic: 0.0
- Roughness: 0.05-0.15 (very smooth, slightly rippled)
- Transmission: 0.95-1.0 (mostly transparent)
- IOR: 1.333 (water)
- Alpha: 1.0

Add Bump node:
- Noise texture (scale: 5.0-10.0) for subtle ripples
- Strength: 0.1-0.2

Add ColorRamp for depth-based color:
- Input: Z-depth or particle info
- Stop 1 (0.0): Light teal (shallow)
- Stop 2 (0.5): Medium teal
- Stop 3 (1.0): Dark teal (deep)
```

**Water Depth:**
- Edge depth: 0 meters (waterline)
- Gradual slope to center
- Maximum depth (center): 2.0-3.0 meters (estimated)

Modeling method:
```
1. Use traced curve from perimeter as top face
2. Duplicate and scale inward slightly for bottom face
3. Offset bottom face downward by 2.5 meters
4. Bridge edge loops to create sloped edges
5. Apply Subdivision Surface for smooth underwater terrain
```

### Island/Peninsula

**Location:** South-center area of lagoon (verified Photo 2 and blueprint)

**Shape:** Irregular organic form (amoeboid)

**Dimensions:**
- Width: 24-30 meters
- Length: 18-24 meters
- Height: Ground level (0.0m) - same as surrounding land

**Connection to Shore:**
- Narrow isthmus visible in Photo 2
- Width: 3-4 meters
- Length: 8-10 meters

**Surface:**
- Material: Lawn (same as surrounding landscape)
- Color: Bright green (#7FB069)

**Edge Treatment:**
- Low shoreline plantings (reeds/grasses)
- Edge type: Natural, irregular

Modeling method:
```
1. Trace island outline from Photo 2 in top view
2. Extrude upward to ground level
3. Add edge loop and scale inward slightly
4. Push down to create subtle shore edge
5. Add grass material matching main lawns
```

### Water Edge Treatment

**Material:** Stone or concrete coping

Specifications:
- Height above water: 0.15-0.25 meters
- Width: 0.3-0.4 meters
- Color: Gray-brown (#8B7D72) = RGB(139, 125, 114) = RGB(0.545, 0.490, 0.447)
- Finish: Matte stone (Roughness: 0.8)

**Edge Vegetation:**

Grasses/Reeds at waterline:
- Plant type: Tall ornamental grasses or reeds
- Height: 0.6-0.9 meters
- Color: Golden-brown/tan (#C4A962) for dried grasses
- Color: Green (#7FB069) for living grasses
- Distribution: Clusters every 2-3 meters along shore
- Modeling: Hair particle system or instanced geometry

**Aquatic Plants:**

Broad-leafed aquatic plants (verified Photo 1, lower right):
- Type: Appears to be calla lilies or similar
- Leaf dimensions: 0.3-0.5m diameter, rounded
- Leaf color: Dark green (#3A5F3A)
- Flowers: White blooms, 0.15-0.20m tall
- Location: Scattered in shallow areas near shore
- Count: 15-25 plant clusters visible in Photo 1 foreground

### Fountain/Water Feature

**Location:** Center of main lagoon body (verified Photo 2)

**Type:** Fountain spray or aerator

**Specifications:**
- Height: 0.9-1.5 meters (spray height)
- Base: Small circular base or floating aerator
- Water effect: Vertical spray pattern
- Color: White/foam appearance

Modeling method:
```
Use particle system:
- Emitter: Small sphere at water surface center
- Particle type: Spray/fountain
- Velocity: Upward (0, 0, 1-2 m/s)
- Lifetime: 0.5-1.0 seconds
- Render as: Droplets or mist
```

### Wildlife (Waterfowl)

**Count:** 8-10 birds visible in Photo 2

**Type:** Swans, ducks, or geese (white appearance suggests swans)

**Distribution:** Scattered across water surface

**Modeling:**
- For distant view: Simple white ovoid shapes (0.5m × 0.3m)
- For closer view: Low-poly bird models
- Animation: Gentle bobbing motion

---

## VEGETATION SYSTEM

### Tree Count & Distribution

**Total verified count:** 95-100 trees across entire site

**Tree types identified:** 3 distinct types based on canopy characteristics

### Type A: Tall Dark Conifers (Italian Cypress)

**Botanical identification:** *Cupressus sempervirens* (Italian Cypress)

**Visual Characteristics:**
- Canopy shape: Narrow columnar, strongly vertical
- Apex: Pointed
- Foliage texture: Very fine, dense
- Foliage color: Very dark green, almost black-green (#1E3A20) = RGB(30, 58, 32) = RGB(0.118, 0.227, 0.125)

**Dimensions:**
- Height: 15-21 meters (verified from shadow analysis in Photo 2)
- Canopy diameter: 2.0-2.5 meters (very narrow)
- Crown ratio: Height is 8-10× diameter (strongly columnar)

**Trunk:**
- Visible height: 2-3 meters before foliage
- Diameter: 0.3-0.5 meters
- Bark color: Medium brown (#6B4E3D)
- Bark texture: Furrowed, vertical grain

**Distribution:**
- Count: 25-30 trees of this type
- Primary locations:
  - Dense cluster behind rotunda (north): 12 trees
  - Along colonnades: 8-10 trees
  - Scattered around site: 5-8 trees

**Specific Positions (from Photo 2):**

Behind Rotunda cluster:
1. (-8, 22, 0)
2. (-6, 23, 0)
3. (-4, 24, 0)
4. (-2, 24, 0)
5. (0, 25, 0)
6. (2, 24, 0)
7. (4, 24, 0)
8. (6, 23, 0)
9. (8, 22, 0)
10. (-7, 20, 0)
11. (-3, 21, 0)
12. (3, 21, 0)

(Continue for all 25-30 trees based on Photo 2 positions)

**Modeling Method:**

Simple approach:
```
1. Create cone mesh:
   - Base radius: 1.25m
   - Top radius: 0.5m (tapered top)
   - Height: 18m
   - Segments: 12 (low poly)

2. Trunk: Cylinder
   - Height: 2.5m
   - Radius: 0.4m
   - Position at base

3. Material:
   - Foliage: Very dark green (#1E3A20), Roughness 0.8
   - Use cloud/noise texture for foliage detail
   - Trunk: Brown (#6B4E3D), Roughness 0.9
```

Advanced approach with particles:
```
1. Create branch armature (simple 3-4 bones)
2. Use particle hair system for needle foliage
3. Hair settings:
   - Count: 50,000-100,000
   - Length: 0.5-2.0m (variable)
   - Clump: 0.8-0.9 (very clumped for dense appearance)
   - Children: Simple, 5-10 per parent
```

### Type B: Medium Broadleaf Trees (Eucalyptus/Oak)

**Visual Characteristics:**
- Canopy shape: Rounded, spreading crown
- Foliage texture: Coarser than conifers
- Foliage color: Medium green (#6B8E6E) = RGB(107, 142, 110) = RGB(0.420, 0.557, 0.431)

**Dimensions:**
- Height: 12-18 meters
- Canopy diameter: 8-12 meters (spreading form)
- Crown ratio: Height approximately 1.5-2× diameter

**Trunk:**
- Visible height: 4-6 meters before branching
- Diameter: 0.6-0.9 meters
- Bark color: Light gray-brown (#A6998C) for eucalyptus or dark brown (#4A3A2A) for oak
- Bark texture: Smooth to slightly rough depending on species

**Distribution:**
- Count: 40-45 trees of this type
- Primary locations:
  - Behind/between colonnade sections: 20-25 trees
  - Around lagoon perimeter: 15-20 trees

**Modeling Method:**

Sapling Tree Gen addon approach:
```
1. Use Blender Sapling Tree Gen addon
2. Settings for broadleaf:
   - Bevel depth: 0.6-0.9m
   - Branch levels: 3
   - Branches: 15-25 at first split
   - Leaves: 800-1200
   - Leaf size: 0.2-0.4m
   - Leaf shape: Oval or elliptical

3. Material:
   - Leaves: Medium green (#6B8E6E)
   - Use leaf texture with transparency for realistic shape
   - Trunk/branches: Gray-brown, roughness 0.85
```

Simple approach:
```
1. Trunk: Cylinder tapering from 0.8m to 0.3m, height 6m
2. Canopy: Icosphere scaled (10m × 10m × 8m for ellipsoid)
3. Material:
   - Canopy: Cloud texture for foliage variation
   - Base color: Medium green
   - Mix with lighter green (#8CAE7F) using noise for highlights
```

### Type C: Smaller Ornamental Trees

**Visual Characteristics:**
- Canopy shape: Irregular, varied forms
- Height: 8-12 meters
- Canopy diameter: 4-6 meters
- Color: Light to medium green (#7C9E6E)

**Distribution:**
- Count: 20-25 trees
- Locations: Scattered throughout site, often near water edges

**Modeling:** Use same methods as Type B but scale down to 60-75% size

### Ground-Level Vegetation

**Shrubs in Planters:**
- Location: On rotunda pier planters
- Height: 0.5-1.0 meters
- Type: Low leafy shrubs
- Color: Medium green (#6B8E6E)
- Modeling: Clustered spheres (0.3-0.5m diameter) or particle system

**Vines on Structures:**
- Location: Growing over colonnade attic, some on rotunda
- Type: Trailing/climbing vines
- Color: Dark green (#4A6B4A)
- Modeling: Curve modifier following structure edges, with leaf particles

---

## GROUND SURFACES & PATHWAYS

### Lawn Areas

**Total lawn area:** Approximately 8-10 acres (majority of non-water, non-structure site)

**Primary Lawn Color:**
- Base: Bright green (#7FB069) = RGB(127, 176, 105) = RGB(0.498, 0.690, 0.412)
- Variation in sun: Yellow-green (#8CAE6F) = RGB(140, 174, 111) = RGB(0.549, 0.682, 0.435)
- Variation in shade: Deeper green (#5A8E5A) = RGB(90, 142, 90) = RGB(0.353, 0.557, 0.353)

**Material Setup:**
```
Principled BSDF:
- Base Color: Bright green (#7FB069)
- Add ColorRamp node with noise texture:
  - Scale: 15.0-20.0
  - Output to Base Color Mix (factor 0.2)
  - Creates variation between bright and yellow-green

- Roughness: 0.95 (very matte)
- Specular: 0.0 (no shine)

Add detail:
- Use noise texture as bump (scale 50-100 for grass blade texture)
- Bump strength: 0.05-0.1
```

**For higher detail:**
Use grass particle system:
```
- Emitter: Ground plane
- Hair count: 100,000-500,000 (density based on camera distance)
- Hair length: 0.03-0.08m (mowed grass)
- Clumping: 0.3-0.5
- Children: Simple, 3-5 per parent
- Material: Gradient from dark green at base to bright green at tips
```

**Mowing Pattern:**
- Some areas show striping (alternating light/dark stripes)
- Pattern direction: Follows pathway curves organically
- Stripe width: 2-3 meters
- Achieved by: Slightly rotating grass direction or varying color value

### Pathway System

**Primary Pathways (3 main routes):**

**Path 1: Perimeter Path Around Lagoon**
- Width: 3.5-4.0 meters
- Length: Approximately 450 meters (follows lagoon perimeter at 3-6m offset)
- Material: Concrete or paved surface
- Color: Light gray (#D4CEC4) = RGB(212, 206, 196) = RGB(0.831, 0.808, 0.769)

**Path 2: North-South Axis (Baker St to Rotunda)**
- Width: 4.5-5.0 meters
- Length: 120-150 meters
- Material: Same as Path 1
- Entry: Main pedestrian approach from south

**Path 3: Colonnade Walkways**
- Width: Matches colonnade interior (8-10 meters)
- Length: Follows colonnade arc (both sides)
- Material: Same or slightly darker pavement

**Secondary Paths:**
- Count: 5-6 connecting paths
- Width: 2.0-2.5 meters
- Same material as primary paths

**Pathway Material:**
```
Principled BSDF:
- Base Color: Light gray (#D4CEC4)
- Roughness: 0.7-0.8 (matte concrete)
- Add slight variation with noise (scale 30-50, strength 0.1)
- Add bump for texture (scale 80-100, strength 0.02)

Optional detail:
- Control joints every 2-3 meters (dark lines)
- Slight discoloration at edges (darker by 10%)
```

**Edge Treatment:**
- Type: Flush with lawn (no visible curb in photos)
- Transition: Sharp edge or slight bevel (1-2cm)

### Rotunda Plaza

**Location:** Surrounding rotunda base

**Dimensions:**
- Radius from rotunda center: 22-25 meters
- Shape: Irregular following rotunda footprint and pier projections

**Material:**
- Type: Paved plaza (appears same as pathways)
- Color: Light gray (#D4CEC4)
- Pattern: Possibly radial or concentric (not clearly visible in photos)

### Terrain Modeling

**Elevation Changes:**
- Primary level: 0.0 meters (datum)
- Site appears relatively flat in photos
- Subtle grading for drainage toward lagoon

**Method:**
```
1. Create large plane (300m × 300m minimum)
2. Subdivide heavily (100-200 subdivisions)
3. In Edit mode, sculpt subtle elevation changes:
   - Slight rise toward rotunda (+0.5 to +1.0m)
   - Slope toward lagoon edges (-0.2 to -0.5m)
   - Use Proportional Editing for smooth transitions
4. Apply Subdivision Surface modifier (1-2 levels)
```

---

## MATERIAL DEFINITIONS

### Material Library Summary

**Material 1: Terracotta (Rotunda Dome & Columns)**
```
Name: MAT_Terracotta_Dome
Base Color: RGB(0.851, 0.569, 0.431) - #D9916E
Roughness: 0.85
Specular: 0.3
Normal Map: Fine plaster texture (scale 20)
ColorRamp weathering: Add subtle variation (±10% value)
```

**Material 2: Cream Stone (Drum & Colonnade)**
```
Name: MAT_Cream_Stone
Base Color: RGB(0.910, 0.863, 0.784) - #E8DCC8
Roughness: 0.75
Specular: 0.35
Bump: Fine limestone texture (scale 25)
Dirt/weathering: Darker streaks using Musgrave texture in crevices
```

**Material 3: Terracotta Red (Podium & Walls)**
```
Name: MAT_Terracotta_Red
Base Color: RGB(0.784, 0.396, 0.290) - #C8654A
Roughness: 0.9 (very rough - rusticated)
Displacement: For rustication (depth 0.05-0.08m)
Normal: Heavy stone block texture
Color variation: ±15% for individual blocks
```

**Material 4: Water**
```
Name: MAT_Lagoon_Water
Shader: Principled BSDF
Base Color: Gradient teal (light #8BBFB3 to dark #4A6B5E)
Metallic: 0.0
Roughness: 0.05-0.15
Transmission: 0.98
IOR: 1.333
Bump: Noise texture (subtle ripples)
```

**Material 5: Lawn Grass**
```
Name: MAT_Lawn
Base Color: RGB(0.498, 0.690, 0.412) - #7FB069
Roughness: 0.95
Specular: 0.0
Color variation: Noise texture ±15%
Bump: High-frequency noise for grass texture
```

**Material 6: Pathway Concrete**
```
Name: MAT_Concrete_Path
Base Color: RGB(0.831, 0.808, 0.769) - #D4CEC4
Roughness: 0.75
Slight color variation: ±5%
Bump: Medium concrete texture (scale 60)
```

**Material 7: Foliage (Cypress)**
```
Name: MAT_Foliage_Cypress_Dark
Base Color: RGB(0.118, 0.227, 0.125) - #1E3A20
Roughness: 0.85
Subsurface: 0.1 (slight light penetration)
Subsurface Color: Slightly lighter green
```

**Material 8: Foliage (Broadleaf)**
```
Name: MAT_Foliage_Broadleaf
Base Color: RGB(0.420, 0.557, 0.431) - #6B8E6E
Roughness: 0.7
Subsurface: 0.15
Translucency: Leaf texture with alpha for realistic shapes
```

---

## LIGHTING & ATMOSPHERE

### Primary Light Source: Sun

**Sun Position (from Photo 2 shadow analysis):**
- Direction: From southwest
- Elevation angle: 40-50° above horizon
- Azimuth: Approximately 225° (southwest)

**Blender Sun Lamp Settings:**
```
Type: Sun
Strength: 1.5-2.0
Color: Warm sunlight RGB(1.0, 0.95, 0.85) - slight yellow tint
Angle: 0.5° (sharp shadows, matching photos)
Rotation:
  - X: 135° (elevation)
  - Y: 0°
  - Z: 225° (azimuth - southwest)
```

### Sky & Environment

**Sky Color (from Photo 2):**
- Base: Vibrant blue (#2E7BC4) = RGB(46, 123, 196) = RGB(0.180, 0.482, 0.769)
- Horizon: Slightly lighter (#5FA3D9)
- Zenith: Slightly darker (#1E5A8C)

**Clouds:**
- Type: Cumulus (puffy)
- Coverage: 30-40%
- Color: Bright white RGB(0.98, 0.98, 0.95) with gray bases RGB(0.6, 0.62, 0.65)

**Environment Setup:**

Option 1 - Procedural Sky:
```
World shader:
- Use Sky Texture node (Nishita Sky)
- Sun Elevation: 45°
- Sun Rotation: 225°
- Ground Albedo: 0.3
- Altitude: 50m (low altitude for richer color)
- Air: 1.0
- Dust: 2.0 (for golden hour warmth if desired)
- Ozone: 0.5
```

Option 2 - HDRI + Painted Clouds:
```
- Use HDRI sky image matched to sun position
- Composite painted clouds in compositor or use cloud texture
- Mix Factor: 0.7 HDRI, 0.3 procedural
```

### Atmospheric Effects

**Fog/Mist:**

Not heavy fog, but atmospheric perspective visible in photos:
```
World > Mist Pass:
- Start: 100m
- Depth: 300m
- Falloff: Quadratic

Compositor:
- Mix fog color (light blue-white) based on Z-depth
- Factor: 0.15-0.25 (subtle)
```

**Light Rain (User Specification):**

Particle system for rain:
```
- Emitter: Large plane above scene (200m × 200m at height 50m)
- Particle count: 10,000-50,000 (density preference)
- Lifetime: 3-5 seconds
- Velocity: (0, 0, -8) m/s (falling straight down)
- Size: 0.01-0.02m (small droplets)
- Render as: Streaks or tiny spheres with motion blur

Material:
- Translucent white/gray
- Alpha: 0.3-0.5 (semi-transparent)
```

Rain surface effects:
```
- Add wetness to surfaces: Increase specular, decrease roughness by 20-30%
- Water puddles: Add procedural puddles to pathways (darken color, add reflection)
- Ripples on lagoon: Increase bump noise frequency and amplitude
```

### Additional Lighting

**Ambient/Fill Light:**
```
Type: Area Light (large, soft)
Position: Opposite sun (northeast, elevated)
Strength: 0.2-0.3 (subtle fill)
Color: Cool blue RGB(0.8, 0.85, 1.0)
Size: 50m × 50m (very soft shadows)
```

**Bounce Light (from ground):**
- Enable in render settings
- Light bounces: 4-6
- Clamping: 3.0 (prevent fireflies)

### Time of Day Variations (Optional)

**Golden Hour (Sunset/Sunrise):**
- Sun elevation: 15-20°
- Sun color: Warm orange RGB(1.0, 0.75, 0.5)
- Sky gradient: Orange-pink to deep blue
- Strength: 2.5-3.0

**Midday:**
- Sun elevation: 70-80°
- Sun color: Pure white RGB(1.0, 1.0, 0.98)
- Sky: Bright blue
- Strength: 2.0

**Overcast:**
- Remove sun lamp
- Environment: Uniform gray sky RGB(0.7, 0.7, 0.72)
- Strength: 1.0
- Soft shadows only

---

## MODELING ORDER & HIERARCHY

### Phase 1: Site Foundation (Days 1-2)

**Step 1.1: Project Setup**
- Create new Blender file
- Set units to Metric
- Set scene scale (1 unit = 1 meter)
- Create empty at origin (0, 0, 0) named "SITE_CENTER"
- Import reference images (blueprint, Photo 2 aerial) as background images

**Step 1.2: Terrain Base**
- Create plane (300m × 300m)
- Subdivide (100 × 100 faces minimum)
- Name: GEO_Terrain_Base
- Parent to SITE_CENTER

**Step 1.3: Lagoon Volume**
- Trace lagoon perimeter from Photo 2 using Bezier curve
- Convert to mesh, name: GEO_Lagoon_Perimeter
- Extrude downward 2.5m for water depth
- Boolean subtract from terrain
- Create separate object for water surface: GEO_Water_Surface
- Parent both to SITE_CENTER

### Phase 2: Rotunda Structure (Days 3-7)

**Step 2.1: Rotunda Dome**
- Create UV sphere at (0, 0, 16.46), radius 16.46m
- Delete bottom half (keep hemisphere)
- Name: GEO_Rotunda_Dome
- Create coffers:
  - Method A: Array modifier + Boolean (hexagon pattern)
  - Method B: Displacement modifier with procedural texture
- Create oculus opening (1.6m diameter at apex)
- Apply Subdivision Surface (level 2)
- Parent to empty "GRP_Rotunda"

**Step 2.2: Rotunda Drum**
- Create cylinder (8 sides for octagon)
- Diameter: 38m, Height: 16.46m
- Position: Base at z=0
- Name: GEO_Rotunda_Drum
- Create arch openings (8 arches):
  - Use Array + Curve for arch profile
  - Boolean subtract from drum
- Add relief panel geometry (8 panels)
- Parent to GRP_Rotunda

**Step 2.3: Rotunda Piers (Create one, then array)**

Create master pier at north position (0, 19, 0):

**2.3a: Podium Base**
- Create stepped pyramid (3 tiers)
- Dimensions: 7m wide base, 5.5m projection
- Height: 3m total
- Add rustication texture
- Name: GEO_Pier_Podium_Master

**2.3b: Planters**
- Create stepped platforms on podium
- 2-3 levels
- Add simple shrub geometry (icospheres)
- Name: GEO_Pier_Planters_Master

**2.3c: Exterior Column Pair**
- Create fluted column (method from Colonnade section)
- Height: 13m, Diameter: 1.1m
- Add Corinthian capital
- Duplicate for second column (spacing 3-4m)
- Name: GEO_Pier_Columns_Master

**2.3d: Entablature Section**
- Create architrave, frieze, cornice
- Follow rotunda entablature specs
- Name: GEO_Pier_Entablature_Master

**2.3e: Attic Story**
- Create wall section (5m height)
- Add relief panel geometry
- Name: GEO_Pier_Attic_Master

**2.3f: Urn**
- Create ovoid form (4m height)
- Add decorative bands
- Name: GEO_Pier_Urn_Master

**2.3g: Weeping Maidens**
- Create simplified figure (4m height)
- Position at attic corners (2 per pier)
- Name: GEO_Pier_Maiden_Master

**2.3h: Combine Pier Elements**
- Join all pier elements into collection
- Name: COL_Pier_Master
- Parent to GRP_Rotunda

**Step 2.4: Array Piers**
- Use Array modifier with Empty as object offset
- Create 8 empties at octagon corner positions
- Rotate each 45° increment
- Apply array to create 8 unique piers
- Names: GEO_Pier_01 through GEO_Pier_08

### Phase 3: Colonnades (Days 8-11)

**Step 3.1: West Colonnade**

**3.1a: Create Curve Path**
- Bezier curve, radius 133m, arc angle 175°
- Start point: Connect to Pier 8 (northwest)
- End point: Western pavilion position
- Name: CURVE_Colonnade_West

**3.1b: Create Master Column**
- Following colonnade specifications (10.5m height, 0.95m diameter)
- Include fluting (24 flutes)
- Corinthian capital (1.0m height)
- Attic base (0.45m height)
- Name: GEO_Column_Colonnade_Master

**3.1c: Array Columns**
- Use Array modifier (count: 15) + Curve modifier
- Follow CURVE_Colonnade_West
- Spacing: 14.5m on center
- Apply modifiers and separate into individual columns
- Names: GEO_Col_West_01 through GEO_Col_West_15

**3.1d: Create Entablature**
- Create profile for architrave, frieze, cornice
- Use Curve modifier to follow CURVE_Colonnade_West
- Total height: 2.5m
- Add Greek key pattern to frieze (Boolean or texture)
- Add modillions under cornice (array)
- Name: GEO_Entablature_West

**3.1e: Create Attic Wall**
- Create curved wall following colonnade arc
- Height: 2.75m
- Thickness: 0.45m
- Add coping at top
- Name: GEO_Attic_West

**3.1f: Create Wall Sections**
- Between selected column bays (refer to alternating pattern)
- Height: Ground to entablature
- Thickness: 0.35m
- Material: Terracotta
- Name: GEO_Walls_West_## (for each section)

**3.1g: Create West Pavilion**
- Rectangular structure (9m × 9m)
- Height: Matches colonnade top
- Position at curve end
- Add decorative elements
- Name: GEO_Pavilion_West

**3.1h: Group West Colonnade**
- Parent all west colonnade elements to empty
- Name: GRP_Colonnade_West
- Parent to SITE_CENTER

**Step 3.2: East Colonnade**
- Mirror West Colonnade across Y-axis (north-south)
- Or duplicate and manually position with curve
- Name all elements: GEO_Col_East_##, GEO_Pavilion_East, etc.
- Group: GRP_Colonnade_East
- Parent to SITE_CENTER

### Phase 4: Vegetation (Days 12-15)

**Step 4.1: Create Tree Types**

**4.1a: Type A - Italian Cypress**
- Create master tree following specifications
- Height: 18m, Diameter: 2.3m
- Method: Cone + cylinder trunk OR particle hair system
- Name: GEO_Tree_Cypress_Master
- Add to collection: COL_Trees_Cypress

**4.1b: Type B - Broadleaf**
- Create master tree (Sapling addon or manual)
- Height: 15m, Canopy: 10m diameter
- Name: GEO_Tree_Broadleaf_Master
- Add to collection: COL_Trees_Broadleaf

**4.1c: Type C - Small Ornamental**
- Scale down Type B to 60%
- Name: GEO_Tree_Small_Master
- Add to collection: COL_Trees_Small

**Step 4.2: Place Trees by Zone**

Use Photo 2 as reference for exact positions:

**Zone 1: Behind Rotunda**
- Instance GEO_Tree_Cypress_Master 12 times
- Positions: (-8, 22, 0), (-6, 23, 0)... (refer to tree position list)
- Add slight rotation variation (±10°)
- Group: GRP_Trees_North

**Zone 2-8: Continue for all zones**
- Follow empirical tree counts and positions
- Total instances: ~95-100 trees
- Group by zone: GRP_Trees_West_Colonnade, GRP_Trees_Lagoon_East, etc.

**Step 4.3: Ground Vegetation**
- Add shrubs to rotunda planters (icospheres with particles)
- Add vines to colonnade attic (curve + leaf particles)
- Add aquatic plants to lagoon edge (calla lily models)
- Name: GRP_Vegetation_Ground

### Phase 5: Ground Surfaces (Days 16-17)

**Step 5.1: Lawn Areas**
- Separate terrain into lawn zones
- Apply MAT_Lawn material
- Optional: Add grass particle system (high detail)
- Name: GEO_Lawn_Primary

**Step 5.2: Pathways**

**5.2a: Path 1 - Perimeter**
- Create curve following lagoon at 4m offset
- Convert to mesh, width 3.75m
- Extrude up slightly (0.02m) above terrain
- Name: GEO_Path_Perimeter

**5.2b: Path 2 - North-South Axis**
- Create straight path from (0, -120, 0) to (0, 25, 0)
- Width: 4.75m
- Name: GEO_Path_Main_Axis

**5.2c: Secondary Paths**
- Create 5-6 connecting paths
- Width: 2.25m
- Names: GEO_Path_Secondary_##

**5.2d: Rotunda Plaza**
- Create irregular circle around rotunda base (radius 23m)
- Boolean subtract pier footprints
- Name: GEO_Plaza_Rotunda

**5.2e: Apply Material**
- All paths use MAT_Concrete_Path
- Add control joint lines (dark lines every 2.5m)

**Step 5.3: Lagoon Edge Treatment**
- Create edge coping (0.35m wide, 0.2m high)
- Follow lagoon perimeter
- Material: Gray stone
- Name: GEO_Lagoon_Coping

### Phase 6: Water Features (Day 18)

**Step 6.1: Water Surface**
- Already created in Phase 1
- Apply MAT_Lagoon_Water material
- Add subtle animation (noise displacement on Z-axis, amplitude 0.02m)

**Step 6.2: Island**
- Trace island outline from Photo 2
- Extrude to ground level
- Apply lawn material
- Name: GEO_Island_Central

**Step 6.3: Fountain**
- Create particle emitter at lagoon center
- Spray particles upward (1.2m height)
- Name: GEO_Fountain_Spray

**Step 6.4: Waterfowl**
- Create simple swan/duck model (low poly)
- Instance 8-10 times on water surface
- Add floating animation (gentle bobbing)
- Name: GEO_Waterfowl_##

### Phase 7: Materials & Texturing (Days 19-21)

**Step 7.1: Create All Materials**
- Follow Material Definitions section
- Create material library in .blend file
- Name all materials with MAT_ prefix

**Step 7.2: Apply Materials**
- Rotunda dome: MAT_Terracotta_Dome
- Rotunda drum: MAT_Cream_Stone
- Rotunda piers podium/columns: MAT_Terracotta_Red
- Colonnade: MAT_Cream_Stone
- Water: MAT_Lagoon_Water
- Lawns: MAT_Lawn
- Paths: MAT_Concrete_Path
- Trees: MAT_Foliage_Cypress_Dark, MAT_Foliage_Broadleaf

**Step 7.3: UV Unwrap**
- Unwrap all architectural elements
- Use Smart UV Project or manual unwrapping
- Ensure scale is consistent (important for tiled textures)

**Step 7.4: Texture Painting (Optional)**
- Add weathering details
- Water stains on rotunda
- Dirt accumulation at path edges
- Moss on stone in shaded areas

### Phase 8: Lighting Setup (Day 22)

**Step 8.1: Sun Lamp**
- Create Sun lamp
- Position and angle per specifications (southwest, 45° elevation)
- Strength: 1.75
- Color: Warm white

**Step 8.2: Environment**
- Set up procedural sky (Nishita) or HDRI
- Match sun position
- Add clouds (compositor or 3D volumetric)

**Step 8.3: Fill Lights**
- Create area light (northeast, soft fill)
- Strength: 0.25

**Step 8.4: Atmospheric Effects**
- Enable mist pass
- Set fog distance and falloff
- Add rain particle system (if desired)

### Phase 9: Camera & Composition (Day 23)

**Step 9.1: Camera Placement**

**Option A: Aerial View (matching Photo 2)**
- Position: (-150, -120, 150) approximate
- Rotation: Look at rotunda center (0, 0, 10)
- Focal length: 35-50mm
- Name: CAM_Aerial_Northwest

**Option B: Ground Level (matching Photo 1)**
- Position: (0, -80, 1.6) - south of lagoon, human eye height
- Rotation: Look at rotunda (0, 0, 20)
- Focal length: 50-70mm
- Name: CAM_Ground_South

**Option C: Three-Quarter View**
- Position: (-60, -50, 30) - elevated southwest view
- Rotation: Look at rotunda center
- Focal length: 50mm
- Name: CAM_ThreeQuarter_SW

**Step 9.2: Camera Settings**
- Sensor size: 36mm (full frame)
- Depth of Field: Enable if desired (f-stop 5.6-8.0)
- Clipping: Start 0.1m, End 1000m

**Step 9.3: Render Frame**
- Set render bounds to 900ft × 900ft (274.32m) square if specified
- Or render full site for context

### Phase 10: Rendering & Post-Processing (Days 24-28)

**Step 10.1: Render Settings**

**Render Engine:** Cycles
- Samples: 1024-2048 (high quality)
- Denoising: OpenImageDenoise
- Light paths:
  - Max bounces: 12
  - Diffuse: 4
  - Glossy: 4
  - Transmission: 8 (for water)
  - Volume: 2
  - Transparent: 8

**Resolution:**
- 4K: 3840 × 2160
- Or 8K: 7680 × 4320 (if system capable)

**Film:**
- Transparent background: No (use sky)
- Filter width: 1.5 (slight soften)

**Step 10.2: Render Passes**

Enable passes:
- Combined
- Z-depth
- Normal
- Ambient Occlusion
- Diffuse Color
- Glossy Color
- Transmission
- Mist
- Shadow

**Step 10.3: Compositor Setup**

**Node setup:**
```
1. Import render layers
2. Add Glare node (streaks for sun, strength 0.3)
3. Add Color Balance (warm shadows, cool highlights)
4. Mix Mist pass for atmospheric depth
5. Add lens distortion (subtle, 0.02)
6. Vignette (darken edges slightly)
7. Final color correction and levels
```

**Step 10.4: Test Renders**
- Render at 1920×1080 with 256 samples
- Check lighting, materials, composition
- Iterate and adjust

**Step 10.5: Final Render**
- Render at full resolution (4K or 8K)
- Full sample count (2048)
- Render time estimate: 2-8 hours depending on hardware

**Step 10.6: Post-Processing (Photoshop/GIMP)**
- Import EXR render with all passes
- Fine-tune color grading
- Add atmospheric haze if needed
- Sharpen details
- Final export as PNG or JPEG

---

## OPTIMIZATION NOTES

### Polygon Budget

**Target total polygon count:** <2 million triangles for real-time, unlimited for still render

**Current estimates:**
- Rotunda: 50,000-100,000 tris (with coffers)
- Each colonnade: 80,000-120,000 tris
- Trees (all): 200,000-400,000 tris (depends on method)
- Ground/terrain: 50,000-100,000 tris
- Water: 10,000-20,000 tris
- **Total: 470,000-860,000 triangles** (well within budget)

### Performance Considerations

**For still renders:** No performance concerns - use highest detail

**For real-time (Three.js export):**
- Reduce tree poly count (use billboard sprites for distant trees)
- Simplify coffers (use normal maps instead of geometry)
- Reduce terrain subdivision
- LOD (Level of Detail) system for trees and architectural details
- Texture size limit: 2K for most, 4K for key elements only

### Export for Three.js

**Steps:**
1. Simplify geometry (Decimate modifier, target 100k-200k total polys)
2. Bake textures (diffuse, normal, roughness) to 2K maps
3. Export as GLB/GLTF format
4. Test in Three.js viewer
5. Optimize further if needed

---

## FINAL DELIVERABLES

**Required outputs:**
1. .blend file with complete scene (organized, named properly)
2. Final render (4K or 8K PNG/EXR)
3. Contact sheet with multiple views (aerial, ground, detail shots)
4. Optimized GLB export for Three.js integration (<50MB target)
5. Material library (all shaders documented)
6. Reference documentation (this blueprint + notes)

---

## TIMELINE ESTIMATE

**Total project duration:** 28-35 days for one person, working 6-8 hours/day

**Phase breakdown:**
- Phase 1 (Site Foundation): 2 days
- Phase 2 (Rotunda): 5 days
- Phase 3 (Colonnades): 4 days
- Phase 4 (Vegetation): 4 days
- Phase 5 (Ground Surfaces): 2 days
- Phase 6 (Water Features): 1 day
- Phase 7 (Materials): 3 days
- Phase 8 (Lighting): 1 day
- Phase 9 (Camera): 1 day
- Phase 10 (Rendering): 5 days

**Buffer time:** 7 days for revisions, problem-solving, detail refinement

---

## VERIFICATION CHECKLIST

Before considering project complete, verify:

- [ ] Rotunda height = 49.38 meters (162 feet) ✓
- [ ] Rotunda has 8 piers in octagonal arrangement ✓
- [ ] Each pier has 2 exterior columns (16 total rotunda columns) ✓
- [ ] Dome has hexagonal coffer pattern ✓
- [ ] Central oculus present at dome apex ✓
- [ ] Each pier has 1 giant urn on top (8 total) ✓
- [ ] Weeping maiden sculptures present on piers ✓
- [ ] Each colonnade has exactly 15 columns (30 total) ✓
- [ ] Colonnade curve is smooth circular arc ✓
- [ ] Lagoon shape matches blueprint (irregular organic) ✓
- [ ] Island/peninsula present in south lagoon ✓
- [ ] Tree count approximately 95-100 total ✓
- [ ] Three distinct tree types present ✓
- [ ] Color palette matches reference photos ✓
- [ ] Terracotta rotunda dome color correct ✓
- [ ] Cream colonnade color (NOT red) ✓
- [ ] Teal-green lagoon water color ✓
- [ ] All measurements derived from verified 162ft rotunda height ✓
- [ ] Materials have appropriate roughness and finish ✓
- [ ] Lighting matches Photo 2 sun position (southwest) ✓
- [ ] Atmospheric fog/mist present but subtle ✓
- [ ] Rain effects added if specified ✓
- [ ] Final render captures full atmosphere ✓

---

**END OF BLUEPRINT**

**Document version:** 1.0
**Last updated:** 2025-10-15
**Author:** Comprehensive empirical analysis of Palace of Fine Arts
**Purpose:** Complete specification for Blender 3D reconstruction

