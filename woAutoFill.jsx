// ── WO auto-fill utilities ───────────────────────────────────────────────────
// Shared between WorkOrderPreviewModal (single) and bulk-create (multiple).
// inferSkills, buildInstructions, buildAutoForm are all pure functions that
// take (sourceType, item) and return data — no React deps.

function inferSkills(sourceType, item) {
  if (item.required_skills?.length) return [...item.required_skills]

  const text = [item.description || '', item.title || '', item.code || '']
    .join(' ').toLowerCase()
  const skills = new Set()

  if (sourceType === 'fault_code' && item.code) {
    const code = (item.code || '').toUpperCase()
    if (/^P[01]/.test(code)) skills.add('Diesel')
    if (/^B[01]/.test(code)) skills.add('Electrical')
    if (/^C/.test(code))     skills.add('Brakes')
    if (/^U/.test(code))     skills.add('Electrical')
  }
  if (/brake|pedal|brake line|abs|caliper|rotor|drum|air brake/.test(text))   skills.add('Brakes')
  if (/engine|oil|coolant|fuel|diesel|transmission|differential|injector|exhaust|catalyst|def|turbo|dpf/.test(text)) skills.add('Diesel')
  if (/electric|light|wiring|panel|battery|volt|fuse|relay|alternator|sensor|ecu|can bus|communication|network/.test(text)) skills.add('Electrical')
  if (/tire|tyre|wheel|rotation|inflation|pressure/.test(text))               skills.add('Tires')
  if (/hvac|heat|air condition|blower|refriger|cab temp|climate/.test(text))  skills.add('HVAC')
  if (/windshield|wiper|mirror|seat belt|suspension|steering|power steering|headlight|alignment/.test(text)) skills.add('General')
  if (skills.size === 0) skills.add('General')
  return [...skills]
}

// ── Instruction generation ────────────────────────────────────────────────────
/**
 * Returns a numbered step-by-step instruction string tailored to the task.
 * variant 0 = default; variant 1 = rewrite (different wording / sequence).
 * Always returns at least 5 steps. Falls back to a generic checklist if no
 * specific scenario matches.
 */
function buildInstructions(sourceType, item, variant = 0) {
  const asset = item.asset_name || 'vehicle'
  const v     = variant % 2    // 0 or 1
  const text  = [item.description || '', item.title || '', item.code || '']
    .join(' ').toLowerCase()
  const faultCode = (item.code || '').toUpperCase()

  let steps

  // ── BRAKES ────────────────────────────────────────────────────────────────
  if (/spongy|soft.*pedal|pedal.*soft|air in brake/.test(text)) {
    steps = [[
      `Inspect brake fluid reservoir level and condition on ${asset} — check for contamination or discoloration`,
      'Visually inspect all brake lines and hoses for leaks, cracks, or loose fittings',
      'Bleed brake lines at all four wheels, starting from the wheel furthest from the master cylinder',
      'Check brake caliper condition on all four corners for fluid leaks or seized pistons',
      'Test pedal firmness after bleeding — pedal should not compress more than halfway to floor under firm pressure',
      'Road test at low speed to confirm braking response before returning vehicle to service',
    ], [
      `Confirm brake fluid type and current level in reservoir on ${asset} before opening any lines`,
      'Attach bleeding kit at the furthest wheel from master cylinder and flush fluid through system',
      'Move systematically to remaining wheels, checking for air bubbles in discharged fluid at each one',
      'Inspect caliper slider pins for free movement — seized pins cause uneven pad wear and soft pedal',
      'Top off reservoir to MAX mark with correct DOT-rated fluid after bleeding is complete',
      `Apply firm steady brake pressure in stationary ${asset} — confirm pedal is solid with no fade before road test`,
    ]][v]

  } else if (/air brake.*test|brake.*performance test|dot.*brake/.test(text)) {
    steps = [[
      `Build air system pressure to 90–120 PSI on ${asset} with engine running`,
      'Perform static leak-down test with engine off — pressure loss must not exceed 3 PSI in 3 minutes',
      'Apply full service brake application and hold for 1 minute — check pressure loss does not exceed 4 PSI',
      'Inspect all air lines, glad hands, and brake chambers for audible or soapy-water-detected leaks',
      'Check governor cut-out pressure (120–135 PSI) and cut-in pressure (90–100 PSI)',
      'Document all test results and confirm compliance with FMCSA air brake performance standards',
    ], [
      `Check air dryer and purge valve operation on ${asset} — cycle compressor and listen for proper timed purge`,
      'Build system pressure and record governor cut-out pressure — must be 120–135 PSI to pass',
      'Fan service brakes to confirm low-pressure warning activates at or above 60 PSI',
      'Check emergency / spring brake system by dropping air to below 30 PSI and confirming spring brakes apply',
      'Inspect brake stroke at each chamber with brakes applied — measure push rod travel and compare to adjustment limit',
      'Attach DOT inspection tag after passing test — document vehicle ID, date, and technician signature',
    ]][v]

  } else if (/brake fluid flush/.test(text)) {
    steps = [[
      `Test existing brake fluid moisture content on ${asset} with a test strip — record reading before drain`,
      'Connect pressure bleeder to master cylinder reservoir and introduce fresh fluid to push old fluid through',
      'Open each bleeder valve in sequence — rear far, rear near, front far, front near — flush until fluid runs clear',
      'Confirm reservoir is filled to MAX mark and all bleeder screws are tightened and capped',
      'Apply brakes firmly 10 times and check pedal height remains consistent',
      'Road test with multiple controlled stops from 20 MPH — confirm brake feel before returning to service',
    ], [
      `Locate brake fluid type specification on ${asset} door jamb or service manual before draining`,
      'Drain fluid from reservoir and clean any sludge from bottom of reservoir with clean shop rag',
      'Attach vacuum bleeder to furthest wheel and draw fluid through until clean, bubble-free fluid appears',
      'Work toward master cylinder, flushing each corner in sequence and checking for leaks at each bleeder',
      'Refill to MAX mark with fresh DOT 3 or DOT 4 as specified — never mix fluid ratings',
      'Verify pedal is firm and does not creep toward floor under sustained pressure before signing off',
    ]][v]

  } else if (/abs.*sensor|wheel speed sensor/.test(text)) {
    steps = [[
      `Connect scanner to ${asset} and read ABS DTCs — note which wheel position is flagging`,
      'Inspect affected wheel speed sensor and wiring harness for damage, corrosion, or mud packing',
      'Check sensor air gap with feeler gauge — spec is typically 0.5–1.5 mm from tone ring',
      'Clean tone ring with wire brush and inspect for missing or chipped reluctor teeth',
      'Clear fault codes and test drive above 15 MPH — confirm ABS warning light does not return',
      'If code returns, replace sensor and retest — confirm ABS activation during a controlled slow-speed hard stop',
    ], [
      `Retrieve ABS DTCs on ${asset} and review freeze frame data — note vehicle speed and conditions when fault set`,
      'Raise and secure affected wheel — remove wheel to fully access sensor and wiring',
      'Check sensor connector pins for bent terminals or corrosion — clean with electrical contact cleaner',
      'Measure sensor resistance with multimeter — typical spec is 800–1400 ohms; open or short reading confirms sensor failure',
      'Inspect trigger wheel for packed mud or debris that could cause intermittent signal dropout',
      'Reinstall wheel, clear codes, confirm no recurrence through ABS self-test at 15+ MPH on a test drive',
    ]][v]

  // ── DIESEL / ENGINE ───────────────────────────────────────────────────────
  } else if (/oil pressure warning|oil pressure.*light|oil.*pump failure/.test(text)) {
    steps = [[
      `Do not restart engine on ${asset} until oil level is checked — shut down immediately if still running`,
      'Check engine oil level on dipstick — record actual level and compare to MIN and MAX marks',
      'Inspect oil fill cap, valve cover gasket, and oil pan seam for fresh external leaks',
      'Connect scanner and read live oil pressure sensor value — compare to spec at idle (10–15 PSI typical minimum)',
      'Perform manual oil pressure test with a mechanical gauge to confirm sensor reading is accurate',
      `Top off oil if low, restart ${asset}, re-verify pressure on scanner, clear codes, and confirm warning light does not return after 10-minute idle`,
    ], [
      `Confirm ${asset} is safe to move before engine start — tow if pressure was critically low when warning appeared`,
      'Remove dipstick and note oil color and consistency — milky oil indicates coolant contamination; gritty oil indicates wear',
      'Inspect oil filter for damage or loose installation — hand-check torque before starting engine',
      'Attach mechanical oil pressure gauge to port near oil filter and run engine briefly at idle — record pressure in PSI',
      'If pressure is below 5 PSI at idle, shut down immediately — do not drive; arrange repair or tow',
      'After confirming adequate pressure, change oil and filter if contaminated, clear fault, and verify warning stays off on 15-minute test drive',
    ]][v]

  } else if (/P0420|catalyst.*efficiency|catalyst.*below threshold/.test(faultCode + text)) {
    steps = [[
      `Connect scanner to ${asset} and review freeze frame data for P0420 — note conditions and mileage when code set`,
      'Inspect exhaust system for leaks upstream of catalytic converter — look for soot deposits at manifold joints',
      'Check upstream O2 sensor wiring for damage — sensor should oscillate 0.1–0.9 V at operating temp',
      'Check downstream O2 sensor — signal should be relatively stable (low oscillation) if converter is working',
      'Perform fuel trim analysis — misfires and high long-term fuel trims can trigger false P0420',
      'If O2 sensor data confirms inefficiency and all other causes are ruled out, document findings and quote catalytic converter replacement',
    ], [
      `Verify no active misfires on ${asset} before diagnosing P0420 — misfires push raw fuel through converter and trigger false efficiency codes`,
      'Confirm fuel trims are within ±5% STFT and ±10% LTFT using live scanner data',
      'Inspect for vacuum leaks at intake manifold and EGR connections using smoke machine',
      'Test converter efficiency with downstream O2 sensor voltage pattern — flat low signal confirms inefficiency',
      'Check for oil or coolant consumption that may be contaminating the converter substrate',
      'Clear code and complete a full drive cycle — if P0420 resets within 2 cycles, catalytic converter replacement is confirmed',
    ]][v]

  } else if (/P0087|fuel.*pressure.*low|fuel rail.*pressure/.test(faultCode + text)) {
    steps = [[
      `Connect scanner to ${asset} and check live fuel rail pressure — compare to spec (typically 55–65 PSI at idle)`,
      'Inspect fuel filter condition — a blocked filter is the most common cause of low rail pressure',
      'Verify fuel level in tank and listen for fuel pump prime on key-on (should run for 2 seconds)',
      'Perform fuel pump volume test — should flow minimum 0.25L in 15 seconds at full pump load',
      'Inspect fuel pressure regulator and check vacuum line for raw fuel (indicates failed diaphragm)',
      'Replace fuel filter first if near service interval — retest pressure before condemning the pump',
    ], [
      `Review freeze frame for P0087 on ${asset} — fault under acceleration vs. idle points to pump vs. filter respectively`,
      'Inspect fuel supply line from tank to engine for kinks, clamping damage, or collapsed hose',
      'Connect mechanical fuel pressure gauge at rail — sustained reading below 45 PSI under load confirms supply issue',
      'Check injector return line flow — excessive return can bleed down rail pressure under load',
      'On high-pressure common-rail diesel systems, inspect high-pressure pump for internal leakage',
      'Replace fuel filter, retest rail pressure, and perform a full-load road test before clearing code',
    ]][v]

  } else if (/transmission.*fluid|fluid.*flush.*trans/.test(text)) {
    steps = [[
      `Warm ${asset} transmission to operating temperature before service — 5–10 min of driving is sufficient`,
      'Raise vehicle and locate transmission drain plug or sump — position an adequately sized drain pan',
      'Drain full fluid volume and inspect condition — dark or burnt-smelling fluid indicates heat damage',
      'Remove and inspect transmission filter — replace during every fluid service regardless of appearance',
      'Inspect drain pan magnet for metal debris — light gray sludge is normal; chunky particles indicate wear',
      'Reinstall pan with new gasket, refill with correct fluid type and quantity, and check level at operating temp in PARK',
    ], [
      `Check current fluid color and smell on ${asset} dipstick before draining — document for service record`,
      'Place drain pan below sump, remove drain plug, and allow full drain for at least 5 minutes',
      'Replace filter and o-ring on serviceable filter-style transmissions — clean all mating surfaces before assembly',
      'Reinstall drain plug with a new copper washer and torque to specification',
      'Fill with manufacturer-specified fluid type via dipstick tube or fill port',
      'Check fluid level at operating temperature with vehicle in PARK — add fluid as needed to reach FULL mark',
    ]][v]

  } else if (/rear differential|differential service/.test(text)) {
    steps = [[
      `Raise and support ${asset} securely — locate rear differential fill and drain plugs`,
      'Remove drain plug and drain all gear oil into a clean pan — inspect oil for water or metal particles',
      'Check drain plug magnet for ferrous debris — light residue is normal; chunky or shiny particles indicate wear',
      'Reinstall drain plug with a new copper washer and torque to factory specification',
      'Fill with correct gear oil grade until fluid just reaches the bottom of the fill hole thread',
      'Reinstall fill plug and lower vehicle — check for leaks at both plugs after lowering',
    ], [
      `Clean differential housing exterior on ${asset} before opening fill or drain plugs to prevent contamination`,
      'Remove fill plug first — confirm it is not seized before opening drain plug (a stuck fill plug makes refilling impossible)',
      'Drain old oil and note condition — dark or watery fluid indicates a seal leak or extended service interval',
      'Inspect axle seals at both ends of the differential for seeping or weeping — flag any seal leaks for follow-up repair',
      'Refill with specified hypoid gear oil — typical capacity is 1.5–2.5 quarts depending on axle size',
      'Reinstall fill plug and torque to spec — verify no seepage at either plug before completing service',
    ]][v]

  } else if (/fuel filter/.test(text)) {
    steps = [[
      `Locate the fuel filter on ${asset} — consult service manual for exact position (frame rail, engine bay, or in-tank)`,
      'Relieve fuel system pressure by pulling the fuel pump fuse and cranking engine until it stalls',
      'Place absorbent pad and drain pan below filter — fuel spillage is expected when lines disconnect',
      'Remove filter using the correct filter wrench — note the flow direction arrow for correct reinstallation',
      'Install new filter in the correct flow direction — verify line connectors seat with an audible click',
      'Reinstall fuse, prime system with 3 key-on cycles of 5 seconds each, and inspect all connections for leaks',
    ], [
      `Confirm replacement filter part number matches vehicle spec on ${asset} before beginning`,
      'Depressurize fuel system per service manual — on high-pressure systems skip this step at your peril',
      'Disconnect fuel lines using a plastic line-disconnect tool — never use pliers on quick-connect fittings',
      'Transfer any captured fuel from canister-style filters into a safe disposal container',
      'Install new filter and confirm all quick-connect fittings are fully engaged and locked',
      'Start engine at idle, inspect all connections for seepage, and run for 2 minutes before returning vehicle',
    ]][v]

  // ── ELECTRICAL ──────────────────────────────────────────────────────────────
  } else if (/u0100|lost communication|can bus|ecm.*pcm|pcm.*ecm/.test(text)) {
    steps = [[
      `Connect a bi-directional scanner to ${asset} — retrieve all stored communication DTCs before clearing anything`,
      'Check battery voltage and charging output — low voltage commonly causes multiple module communication faults simultaneously',
      'Inspect main power and ground connections at ECM/PCM for corrosion or looseness',
      'Check CAN bus connector at ECM and main junction box for bent or corroded terminals',
      'Look for any recent battery disconnection, module programming, or added accessories that could disrupt CAN network',
      'Clear all codes, test drive, and note which codes return — a single intermittent U0100 often points to a ground or power supply issue rather than module failure',
    ], [
      `Review which modules have lost communication on ${asset} — a pattern (all modules vs. one) narrows the fault location`,
      'Measure battery voltage at rest (12.4–12.6V normal) and under load during cranking (must remain above 9.6V)',
      'Clean and retorque all chassis and engine block ground connections — poor grounds are the most common cause of CAN bus faults',
      'Use oscilloscope or advanced scanner to verify CAN Hi / CAN Lo bus voltages — 2.5V at rest, 3.5V / 1.5V active',
      'Inspect wiring harness at firewall grommet and near exhaust heat shields for chafing or heat damage',
      'Replace ECM only after all wiring, power, and ground issues are fully ruled out — confirm programming availability before ordering',
    ]][v]

  } else if (/battery terminal|terminal.*clean|corrosion.*battery/.test(text)) {
    steps = [[
      `Inspect both battery terminals on ${asset} for white or blue-green corrosion — wear gloves and eye protection`,
      'Disconnect negative cable first, then positive cable — set cables clear of battery posts',
      'Mix 1 tablespoon baking soda with 1 cup of water and pour over terminals to neutralize battery acid',
      'Scrub posts and cable clamps with a wire terminal brush until clean bare metal is visible',
      'Rinse with clean water and dry thoroughly with a shop rag',
      'Apply anti-corrosion spray or petroleum jelly to both posts before reconnecting — reconnect positive cable first, then negative',
    ], [
      `Check battery voltage on ${asset} before service — load test if vehicle has had slow-crank complaints`,
      'Use a memory saver to preserve ECM settings before disconnecting battery cables',
      'Remove both cables and clean battery tray and hold-down bracket if corrosion has spread',
      'Use a corrosion neutralizing brush with integrated cleaning solution for a thorough clean on both posts and clamps',
      'Inspect battery case for cracks or swelling — replace battery if case is compromised',
      'Reconnect and torque terminal bolts to spec — start vehicle and confirm no warning lights before returning to service',
    ]][v]

  } else if (/battery.*low|battery.*volt|voltage.*low/.test(text)) {
    steps = [[
      `Connect a battery load tester to ${asset} — perform CCA test and compare result to battery rating label`,
      'Check charging voltage at battery terminals with engine running — spec is 13.8–14.7V at idle',
      'Inspect alternator belt tension and condition — a slipping belt produces low charging voltage',
      'Inspect battery hold-down and confirm battery is secure — vibration accelerates internal plate damage',
      'Replace battery if it fails the load test — match or exceed original CCA rating for the duty cycle',
      'After replacement, clear charging-related codes and confirm stable charging voltage on a 20-minute test drive',
    ], [
      `Check battery date code on ${asset} — batteries over 4 years old are prime candidates for replacement regardless of test result`,
      'Measure parasitic drain with ammeter after 20-minute sleep cycle — should be below 50 mA',
      'Load test battery at half its CCA rating for 15 seconds — voltage must not drop below 9.6V to pass',
      'Apply AC voltmeter across battery with engine running — over 0.5V AC ripple indicates a failing alternator diode',
      'Inspect battery case for cracks, swelling, or electrolyte seepage at post seals',
      'Replace battery, record install date in maintenance system, and advise operator to report any recurrence of the warning',
    ]][v]

  // ── HVAC ──────────────────────────────────────────────────────────────────
  } else if (/hvac.*blower|blower.*motor|blower.*fault|B0080/.test(faultCode + text)) {
    steps = [[
      `Test all blower speed positions on ${asset} — note exactly which speeds work and which fail`,
      'Check blower motor fuse and relay — consult wiring diagram for location in fuse block',
      'Measure voltage at blower motor connector with key on and fan set to HIGH — should read battery voltage',
      'Apply 12V directly to motor pigtail as a bench test — if motor runs, the fault is upstream in the circuit',
      'Inspect blower motor resistor pack — melted or burned resistor is the most common cause of single-speed failure',
      'If motor fails direct power test, remove blower assembly and bench test — replace motor if seized or open circuit',
    ], [
      `Record which fan speeds fail on ${asset} — all speeds failing suggests motor or power supply; one speed suggests resistor`,
      'Remove lower dash trim or glove box to access HVAC blower motor assembly',
      'Inspect blower wheel for debris — leaves, pine needles, and rodent nests commonly cause intermittent stalls',
      'Check motor ground connection at housing — poor ground causes low-speed intermittent failure',
      'Trace circuit with test light from fuse block through relay to motor connector',
      'Replace resistor or motor as confirmed — verify all speed positions function correctly before reassembling dash',
    ]][v]

  // ── TIRES ─────────────────────────────────────────────────────────────────
  } else if (/tire.*pressure|inflation|tyre.*pressure/.test(text)) {
    steps = [[
      `Locate tire placard on ${asset} driver's door jamb — confirm correct cold inflation pressure for front and rear`,
      'Check pressure at all four tires and spare with a calibrated gauge before vehicle has been driven',
      'Record actual readings vs. specification — note any tires more than 5 PSI over or under spec',
      'Inflate or deflate each tire to match placard specification — verify final pressure with gauge after adjusting',
      'Inspect each tire sidewall and tread surface for cuts, bulges, cracks, or abnormal wear patterns',
      'Confirm TPMS warning light clears — if light persists after inflation, perform TPMS sensor reset procedure',
    ], [
      `Confirm tire pressure spec from ${asset} door jamb — do not use the MAX PRESS value on the tire sidewall`,
      'Check pressures cold — hot tires read 4–6 PSI higher and should not be deflated to compensate',
      'Use a calibrated digital gauge — spring-style gauges frequently read 3–5 PSI below actual',
      'Measure tread depth at three points across each tire — flag any tire at or below 4/32" for replacement',
      'Inspect valve stems and caps — replace missing caps and check for slow leaks by applying soapy water',
      'Document all before/after pressure readings in the maintenance log — include mileage and date',
    ]][v]

  // ── GENERAL — Coolant hose ────────────────────────────────────────────────
  } else if (/coolant.*hose|hose.*leak|radiator hose|overheating/.test(text)) {
    steps = [[
      `Confirm engine is completely cold on ${asset} before opening any cooling system components`,
      'Pressurize cooling system with a pressure test kit — apply 15–18 PSI and watch for pressure drop over 10 minutes',
      'Locate the leaking hose — look for seeping coolant, mineral deposits, or wet hose surface',
      'Drain coolant from radiator petcock into a clean container for disposal or reuse if uncontaminated',
      'Remove old hose clamps and hose, then install new hose — ensure full seating over both nipples and position clamps past the retaining bead',
      'Refill with correct coolant mix, bleed air per service procedure, run to operating temp, and confirm no leaks',
    ], [
      `Inspect all coolant hoses on ${asset} during this repair — hoses of the same age often fail in succession`,
      'Squeeze all hoses with engine cold — soft, mushy hoses indicate internal delamination and should be replaced',
      'Inspect hose clamps for corrosion or insufficient clamping force — replace any worm-gear clamps showing rust',
      'Remove failing hose and clean both connection nipples before installing new hose',
      'Refill with 50/50 mix of manufacturer-specified coolant type and distilled water — do not use tap water',
      'Run engine to operating temperature and verify coolant level, heater output, and absence of leaks before sign-off',
    ]][v]

  } else if (/power steering.*fluid|steering.*fluid low/.test(text)) {
    steps = [[
      `Check power steering fluid level on ${asset} on level ground, engine off — compare to MIN and MAX marks on reservoir`,
      'Inspect reservoir cap o-ring for cracks or hardening',
      'Trace power steering lines from reservoir to pump to rack — look for wet spots, seeping fittings, or swollen hoses',
      'Top off fluid to MAX mark with manufacturer-specified power steering fluid type — do not substitute ATF unless specified',
      'Start engine and turn steering lock-to-lock slowly three times — check for air bubbles rising in reservoir',
      'Recheck fluid level after cycling and monitor over the next 3 days to confirm no active leak',
    ], [
      `Inspect steering rack boots on ${asset} — wet boots indicate rack seal failure and require rack rebuild or replacement`,
      'Check power steering pump pulley for wobble and inspect pump bracket bolts for looseness',
      'Verify drive belt tension on power steering pump — a slipping belt causes heavy steering at low speed',
      'Clean area around reservoir and pump with brake cleaner before topping off — makes new leaks visible',
      'Note current fluid color — black or very dark fluid indicates oxidation and a full flush is recommended',
      'If fluid drops again within one week of topping off, escalate to seal replacement or rack rebuild',
    ]][v]

  } else if (/exhaust.*inspect|exhaust.*system|muffler|manifold/.test(text)) {
    steps = [[
      `Lift ${asset} on hoist and perform visual inspection of the full exhaust system from manifold to tailpipe`,
      'Check all exhaust hangers — inspect for cracks, rust, or rubber isolators that have separated',
      'Inspect pipes along their full length for rust-through, holes, or sections that have separated at welds',
      'Inspect muffler body and seams for rust penetration — tap with a rubber mallet and listen for hollow sound indicating rust-through',
      'Check manifold-to-downpipe connection and gasket for soot deposits that indicate exhaust leaks',
      'Start engine and listen for leaks at idle and under light throttle — document any failed components and recommend repair timeline',
    ], [
      `Confirm ${asset} exhaust system is fully cool before inspection — contact burns are common on rushed jobs`,
      'Start inspection at the manifold and follow the flow direction downstream to the tailpipe',
      'Check catalytic converter heat shields for looseness — rattling shields are a common complaint item',
      'Flex each rubber isolator by hand — replace any that crumble, crack, or have separated from the bracket',
      'Check EGR pipe and DEF injector ports for carbon buildup or heat cracks if equipped',
      'Photograph any components with structural compromise and include in service record for supervisor review',
    ]][v]

  } else if (/def fluid|diesel exhaust fluid/.test(text)) {
    steps = [[
      `Locate the blue DEF filler cap on ${asset} — typically separate from the diesel fill or in a rear compartment`,
      'Check DEF level on the dashboard gauge or via scanner — record current percentage before filling',
      'Use only API-certified DEF — never substitute water, fertilizer-grade urea, or any other fluid',
      'Fill to approximately 90% capacity — leave 10% headspace for thermal expansion',
      'Inspect the fill cap seal and strainer screen for debris or crystallized DEF buildup',
      'Verify SCR/DEF system warning light clears — if it persists after filling, check for a DEF quality sensor fault',
    ], [
      `Confirm DEF fluid quality before adding to ${asset} — DEF degrades in heat and contaminated DEF causes expensive SCR damage`,
      'Inspect the DEF fill cap and strainer for crystallized deposits — flush screen if partially clogged',
      'Record current mileage and pre-fill DEF level in the maintenance log',
      'Add DEF slowly to prevent overflow — DEF is corrosive to painted surfaces and aluminum',
      'Check DEF supply line from tank to SCR catalyst for crystallized deposits in cold-weather conditions',
      'Clear any active SCR codes after filling and verify normal after-treatment operation on a short test drive',
    ]][v]

  } else if (/wiper motor|wiper.*inspect/.test(text)) {
    steps = [[
      `Test all wiper speeds and confirm the park position function on ${asset} — note exactly which functions fail`,
      'Check the wiper motor fuse and relay in the fuse block — replace any blown fuse and re-test before further diagnosis',
      'Inspect the wiper motor connector for corrosion or backed-out terminals — clean with electrical contact cleaner',
      'Measure voltage at the motor connector during attempted operation — should read 12V at the high-speed terminal',
      'Inspect wiper arm pivot points for corrosion-induced binding — apply penetrating oil and cycle wipers to free stuck pivots',
      'If motor runs on bench test but not in vehicle, inspect wiper linkage and transmission for binding or disconnected joints',
    ], [
      `Note which wiper functions fail on ${asset} — all-speed failure suggests motor or power; intermittent suggests stalk switch or module`,
      'Remove wiper arms and inspect pivot shafts for rust — corroded pivots can stall an otherwise good motor',
      'Spray pivots with penetrating lubricant and cycle wipers several times to free the shafts',
      'Inspect the wiper cowl drain area for leaf and debris accumulation that can jam the linkage',
      'Ground-test the motor by connecting directly to a battery — a weak motor will run slowly under mechanical load',
      'Replace wiper motor if confirmed faulty — confirm the park position is set correctly before reinstalling wiper arms',
    ]][v]

  } else if (/suspension.*check|ball joint|tie rod|sway bar/.test(text)) {
    steps = [[
      `Raise ${asset} on hoist and secure on stands — inspect front wheels by gripping at 9 and 3 o'clock for lateral play`,
      'Grip each front wheel at 12 and 6 o\'clock and check for vertical play — movement indicates worn ball joints',
      'Inspect ball joint boots for tears or grease loss — load ball joints with a pry bar and check for movement',
      'Check inner and outer tie rod ends by pushing and pulling toward vehicle center — any detectable play requires replacement',
      'Inspect sway bar end links and frame bushings for cracked rubber or loose fasteners',
      'Document any components showing wear or play — note whether vehicle is safe to drive until next service interval',
    ], [
      `Perform a visual pre-lift inspection on ${asset} — uneven tire wear patterns indicate alignment or suspension issues`,
      'Raise vehicle and support on jack stands — never work under a vehicle supported only by a floor jack',
      'Have an assistant watch for movement at ball joints and tie rod ends while you push and pull each front wheel',
      'Inspect upper strut mounts for cracking or separation — failed strut mounts cause pronounced clunking over bumps',
      'Check rear leaf springs or coil springs for cracks, broken leaves, or compressed ride height',
      'Flag any worn components and recommend a four-wheel alignment after any suspension part replacement',
    ]][v]

  } else if (/seat belt|seatbelt/.test(text)) {
    steps = [[
      `Pull each seat belt on ${asset} to full extension — inspect webbing along its entire length for cuts, fraying, or UV degradation`,
      'Confirm each belt retracts smoothly — a slow or non-retracting belt indicates a failed retractor spring',
      'Test each buckle latch — insert tongue and confirm a positive click, then press release button and confirm immediate release',
      'Check anchor bolt torque at seat attachment and floor anchor points — use a torque wrench to verify specification',
      'Inspect shoulder belt D-ring adjusters for cracks and confirm they slide and lock correctly',
      'Flag any defective belt components — seat belt defects are a DOT safety item; do not return vehicle to service until repaired',
    ], [
      `Pull each seat belt fully on ${asset} and confirm smooth, complete retraction — sticky retractors are a safety hazard`,
      'Inspect all belt webbing for burns, chemical stains, tears, or areas where stitching has separated',
      'Test each buckle under moderate tension — the buckle must not release under load, only when the button is pressed',
      'Check pretensioner connections if vehicle is equipped — do not disconnect or probe with a test light (risk of deployment)',
      'Verify belt height adjusters on the B-pillar lock firmly in place when adjusted and release smoothly on demand',
      'Log inspection in the fleet safety record — include date, odometer reading, and technician name',
    ]][v]

  } else if (/headlight.*align|headlight.*aim|headlamp/.test(text)) {
    steps = [[
      `Park ${asset} on level ground facing a flat wall — set distance at 25 feet from wall to headlight lens face`,
      'Confirm correct tire pressure and approximately half-tank fuel load to normalize vehicle ride height',
      'Mark headlight center positions on the wall with tape — note the horizontal cutoff line of each low beam',
      'Locate vertical and horizontal aim adjustment screws on each headlamp assembly — consult service manual for access',
      'Adjust low-beam cutoff to fall at or just below the horizontal tape mark — typically 2 inches below headlight center height',
      'Verify left/right aim — the hotspot should fall slightly right of center on the wall to avoid blinding oncoming traffic',
    ], [
      `Confirm ${asset} ride height is normal before aiming — springs, tires, and payload all affect headlight projection angle`,
      'Inspect headlight lenses for cracks, moisture, or severe hazing — restore or replace fogged lenses before aiming',
      'Use a calibrated beam aimer tool if available — wall-aiming is approximate and should be used only when no tool is available',
      'Adjust both beams independently — the driver\'s side may intentionally aim slightly lower than the passenger side on some vehicles',
      'Re-verify aim after tightening the adjustment screws — vibration from tightening can shift aim slightly',
      'Record alignment as complete and note any lenses requiring restoration or replacement for the next service visit',
    ]][v]

  } else if (/wiper.*replace|wiper blade/.test(text)) {
    steps = [[
      `Identify the correct wiper blade size for ${asset} — check the owner's manual or look up by year, make, and model`,
      'Lift wiper arm away from windshield — never let the arm snap back against glass without a blade installed',
      'Press the release tab on the wiper blade and slide it down off the hook-style arm connector',
      'Confirm the replacement blade connector style matches the arm — use adapters included in the packaging if needed',
      'Install new blade and confirm a positive engagement click — tug blade firmly to verify it is locked onto the arm',
      'Lower arm gently, test wipers at all speeds, and confirm the sweep pattern is even with no streaking',
    ], [
      `Check wiper arm spring tension on ${asset} before installing new blades — weak arm springs cause streaking even with new blades`,
      'Inspect wiper arm attachment nut at pivot — a loose arm causes chattering and uneven contact across the glass',
      'Replace both blades as a set even if only one appears damaged — matched wear ensures even wiper performance',
      'Clean the windshield with glass cleaner before testing new blades — road film causes temporary streaking',
      'Check rear wiper blade if vehicle is equipped — replace if the rubber shows cracking or splitting at any point',
      'Document blade size and brand used in the vehicle service record for quick reference at next service',
    ]][v]

  } else if (/cabin.*air.*filter|cabin.*filter/.test(text)) {
    steps = [[
      `Locate cabin air filter housing on ${asset} — typically behind glove box, under dash, or in the cowl panel`,
      'Remove glove box or access panel per service manual — on many vehicles, squeezing the sides allows the box to drop',
      'Slide out the old filter and note the airflow direction arrow for correct reinstallation of the new filter',
      'Inspect the filter housing interior for accumulated debris, leaves, or mold growth — clean before installing new filter',
      'Install new filter with airflow arrow matching the arrow marked on the housing',
      'Reinstall access panel and test all HVAC modes — confirm no rattling and normal airflow through all vents',
    ], [
      `Confirm whether ${asset} requires a basic particulate filter or an activated carbon filter — install the same type`,
      'Vacuum the filter housing before installing the new filter to remove debris that bypassed the old filter',
      'Compare the thickness of the old and new filters — a severely flattened old filter confirms the service was overdue',
      'While access is available, inspect HVAC blend doors by moving the temperature control from full cold to full hot and listening for abnormal sounds',
      'Test the recirculation flap by switching between fresh air and recirculation and confirming no air bypasses the door',
      'Write the service date on the new filter frame or record in the fleet system — cabin filters are typically a 12–15k mile interval',
    ]][v]

  } else if (/interior.*light|cargo.*light|overhead lamp|bulb.*replace/.test(text)) {
    steps = [[
      `Confirm the reported lamp is not functioning on ${asset} — test with door open and with the interior light switch on`,
      'Check the interior lighting fuse in the driver fuse panel — replace a blown fuse and retest before proceeding',
      'Locate the lamp housing and use a trim removal tool to gently pry the lens from the headliner or panel',
      'Identify the bulb type from the existing bulb or parts manual — confirm a matching replacement',
      'Install replacement bulb — avoid touching halogen bulb glass with bare hands; use gloves or a clean cloth',
      'Reinstall housing and confirm the lamp activates when the door is opened and with the manual switch',
    ], [
      `Test all interior lights on ${asset} to confirm the issue is isolated to the reported lamp — multiple failures suggest a shared fuse or ground`,
      'Check the door jamb switch for sticking — a stuck-open switch causes the interior light to stay on and drain the battery',
      'Use a test light to confirm voltage is present at the lamp socket before replacing the bulb — may be a wiring issue',
      'Clean lamp socket contacts with electrical contact cleaner if corrosion is visible on the terminals',
      'Install the correct wattage bulb only — a higher-wattage bulb can melt the lens housing or damage wiring',
      'Confirm lamp timing and dimming function if the vehicle uses an ambient lighting or BCM-controlled interior light circuit',
    ]][v]

  // ── DEFAULT ───────────────────────────────────────────────────────────────
  } else {
    steps = [[
      `Review the work order details for ${asset} and confirm all required tools and parts are on hand before starting`,
      'Perform an initial visual inspection of the reported system or area — document current condition with photos if any damage is present',
      'Follow the manufacturer service procedure — refer to the shop manual for torque specs, sequences, and fluid quantities',
      'Check for related symptoms or additional findings during the repair — note anything that may need follow-up',
      'Test the repaired system for correct operation — perform the specific functional check for the repair completed',
      'Document repair details, parts used, and time in the maintenance system — confirm vehicle is ready before returning to service',
    ], [
      `Confirm repair scope with a supervisor before starting on ${asset} if diagnosis is unclear`,
      'Gather vehicle history and check for any prior related repairs — confirm whether this is a recurring issue',
      'Complete the repair using OEM or approved equivalent parts — record all part numbers in the work order',
      'Verify correct fluid levels, fastener torques, and full system function after completing the repair',
      'Road test if applicable — confirm the original complaint is resolved and no new issues were introduced',
      'Clean the work area, return all tools, and confirm vehicle is ready for return to service before closing the work order',
    ]][v]
  }

  return steps.map((step, i) => `${i + 1}. ${step}`).join('\n')
}

export function buildAutoForm(sourceType, item) {
  const notes = buildInstructions(sourceType, item, 0)
  if (sourceType === 'dvir') {
    return {
      title: `DVIR: ${(item.description || '').substring(0, 60)}`,
      description: `Reported by: ${item.reported_by || 'Driver'}. ${item.description || ''}`,
      priority: item.severity || 'medium',
      required_skills: inferSkills('dvir', item),
      estimated_hours: item.estimated_hours || 1.0,
      location: '', scheduled_start: '', notes,
    }
  }
  if (sourceType === 'fault_code') {
    return {
      title: `Fault ${item.code} — ${item.asset_name || 'Unknown asset'}`,
      description: `Fault code ${item.code}: ${item.description || ''}`,
      priority: item.severity || 'medium',
      required_skills: inferSkills('fault_code', item),
      estimated_hours: item.estimated_hours || 2.0,
      location: '', scheduled_start: '', notes,
    }
  }
  return {
    title: `PM: ${item.title || ''}`,
    description: item.description || '',
    priority: item.severity || 'medium',
    required_skills: inferSkills('pm', item),
    estimated_hours: item.estimated_hours || 1.0,
    location: '', scheduled_start: '', notes,
  }
}

export { inferSkills, buildInstructions }
