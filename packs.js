/* XMA Shoot Pack data — verbatim from the official onboarding docs.
   Each pack = { label, intro, productLabel, productFields, sizingRows, assetExtras, preflightExtras, faultsToAvoid }.
   Shared sections (identity, format, creative, model, setting, motionAudio, textBranding) live in SHARED.
   Wizard reads from here — never hard-codes option lists.
*/

window.XMA_PACKS = (() => {

  // ---------- shared option lists used by all 3 packs ----------
  const HIJAB_STYLES = [
    "No hijab","Classic wrapped","Shayla draped","Turkish style","Turban style","Under-cap visible",
    "Loose draped","Pinned neat","Matched to outfit","Contrast color","Brand color","Silk finish",
    "Chiffon flowy","Cotton matte","Embellished","Printed","Two-tone","Draped over one shoulder",
    "Volumized","Sleek close","With cap edge","Half-covered hair","Niqab","Khaleeji shayla",
    "Modern minimal","Layered","Pastel","Neutral tone","Jewel-tone","Metallic accent","Floral print","Solid classic"
  ];
  // Skin tones use real swatch colors so the client can VISUALLY pick the right tone
  // instead of guessing from words. Color values are approximate undertone references.
  const SKIN_TONES = [
    { label: "Porcelain", swatch: "#F5DCC8" }, { label: "Fair", swatch: "#F0CFB4" },
    { label: "Light beige", swatch: "#EDC5A4" }, { label: "Light warm", swatch: "#E8BC97" },
    { label: "Light cool", swatch: "#E3C0A8" }, { label: "Ivory", swatch: "#F0DAC2" },
    { label: "Nude/neutral", swatch: "#E5BFA0" }, { label: "Medium beige", swatch: "#D4A57F" },
    { label: "Medium olive", swatch: "#C19A6B" }, { label: "Medium warm", swatch: "#CC9A6E" },
    { label: "Sun-kissed", swatch: "#C1875E" }, { label: "Golden tan", swatch: "#B57A4E" },
    { label: "Honey", swatch: "#AC7141" }, { label: "Caramel", swatch: "#A06334" },
    { label: "Amber", swatch: "#955E2E" }, { label: "Bronze", swatch: "#8A5128" },
    { label: "Deep tan", swatch: "#7E4624" }, { label: "Warm brown", swatch: "#714020" },
    { label: "Olive deep", swatch: "#6C4424" }, { label: "Chestnut", swatch: "#5E371F" },
    { label: "Mocha", swatch: "#553219" }, { label: "Espresso", swatch: "#4A2A15" },
    { label: "Deep brown", swatch: "#3F2410" }, { label: "Rich ebony", swatch: "#2E1A0B" },
    { label: "Dark cool", swatch: "#3A2418" }, { label: "Dark warm", swatch: "#42230D" },
    { label: "Sand", swatch: "#D7B58A" }, { label: "Peachy", swatch: "#F0BFA0" },
    { label: "Rosy fair", swatch: "#F0C7B3" }, { label: "Neutral medium", swatch: "#C99A78" },
    { label: "Cool deep", swatch: "#4D2E20" }, { label: "Warm deep", swatch: "#5A2E15" }
  ];
  // Nationalities get flag emojis where applicable
  const NATIONALITIES = [
    { label: "Emirati / Khaleeji", emoji: "🇦🇪" }, { label: "Saudi", emoji: "🇸🇦" },
    { label: "Qatari", emoji: "🇶🇦" }, { label: "Kuwaiti", emoji: "🇰🇼" },
    { label: "Omani", emoji: "🇴🇲" }, { label: "Bahraini", emoji: "🇧🇭" },
    { label: "Lebanese", emoji: "🇱🇧" }, { label: "Syrian", emoji: "🇸🇾" },
    { label: "Jordanian", emoji: "🇯🇴" }, { label: "Palestinian", emoji: "🇵🇸" },
    { label: "Egyptian", emoji: "🇪🇬" }, { label: "Iraqi", emoji: "🇮🇶" },
    { label: "Moroccan", emoji: "🇲🇦" }, { label: "Tunisian", emoji: "🇹🇳" },
    { label: "Algerian", emoji: "🇩🇿" }, { label: "Iranian / Persian", emoji: "🇮🇷" },
    { label: "Turkish", emoji: "🇹🇷" }, { label: "Pakistani", emoji: "🇵🇰" },
    { label: "Indian", emoji: "🇮🇳" }, { label: "Bangladeshi", emoji: "🇧🇩" },
    { label: "Filipino", emoji: "🇵🇭" }, { label: "Indonesian", emoji: "🇮🇩" },
    { label: "Malaysian", emoji: "🇲🇾" }, { label: "British", emoji: "🇬🇧" },
    { label: "French", emoji: "🇫🇷" }, { label: "Italian", emoji: "🇮🇹" },
    { label: "Spanish", emoji: "🇪🇸" }, { label: "Russian", emoji: "🇷🇺" },
    { label: "Eastern European", emoji: "🌍" }, { label: "Brazilian", emoji: "🇧🇷" },
    { label: "Latina", emoji: "🌎" }, { label: "East Asian", emoji: "🌏" },
    { label: "African", emoji: "🌍" }, { label: "North African", emoji: "🌍" },
    { label: "Mixed / ambiguous", emoji: "🌐" }, { label: "Representative of target audience", emoji: "🎯" }
  ];
  const HAIR = [
    "Black straight","Black wavy","Black curly","Dark brown straight","Dark brown wavy","Chestnut","Auburn",
    "Brunette long","Brunette bob","Honey blonde","Platinum blonde","Ash blonde","Golden blonde",
    "Red / ginger","Balayage","Ombre","Highlighted","Jet black long","Sleek straight","Loose waves",
    "Tight curls","Afro/coily","Pixie cut","Shoulder length","Half-up","Low bun","High bun",
    "Sleek ponytail","Braided","Wet-look","Voluminous blowout","Covered (hijab)","Partially covered"
  ];
  // Expressions get emoji previews for instant recognition
  const EXPRESSIONS = [
    { label: "Soft smile", emoji: "🙂" }, { label: "Confident", emoji: "😎" },
    { label: "Serene", emoji: "😌" }, { label: "Aspirational gaze", emoji: "✨" },
    { label: "Playful", emoji: "😜" }, { label: "Joyful laugh", emoji: "😄" },
    { label: "Mysterious", emoji: "🌒" }, { label: "Sensual (modest)", emoji: "💋" },
    { label: "Elegant calm", emoji: "🤍" }, { label: "Candid", emoji: "📸" },
    { label: "Editorial neutral", emoji: "🧊" }, { label: "Powerful", emoji: "💪" },
    { label: "Dreamy", emoji: "💭" }, { label: "Warm inviting", emoji: "🌅" },
    { label: "Focused", emoji: "🎯" }, { label: "Surprised delight", emoji: "😲" },
    { label: "Subtle smirk", emoji: "😏" }, { label: "Looking away", emoji: "👀" },
    { label: "Direct eye contact", emoji: "👁" }, { label: "Eyes closed", emoji: "😶" },
    { label: "Over-the-shoulder", emoji: "🙇‍♀️" }, { label: "Contemplative", emoji: "🤔" },
    { label: "Radiant", emoji: "🌟" }, { label: "Cool/aloof", emoji: "🧊" },
    { label: "Approachable", emoji: "🤝" }, { label: "Luxurious ease", emoji: "🥂" },
    { label: "Fresh/natural", emoji: "🌿" }, { label: "Glamorous", emoji: "💎" },
    { label: "Intense", emoji: "🔥" }, { label: "Gentle", emoji: "🕊" },
    { label: "Proud", emoji: "👑" }, { label: "Captivated", emoji: "💫" }
  ];
  const WARDROBE = [
    "Abaya (classic black)","Abaya (colored)","Abaya (embellished)","Kaftan","Modern modest dress",
    "Long-sleeve maxi","Tailored blazer set","Silk blouse","Evening gown","Cocktail dress","Casual chic",
    "Smart casual","Business formal","Luxury loungewear","Knit set","Satin slip (modest layer)",
    "Turtleneck","Wrap dress","Jumpsuit","Two-piece set","Traditional Khaleeji","Bridal","Resort wear",
    "Trench coat","Tweed set","Linen relaxed","All-white look","All-black look","Monochrome",
    "Pastel ensemble","Statement color","Minimalist neutral"
  ];
  const LOCATIONS = [
    "White cyclorama studio","Marble surface studio","Minimalist beige set","Luxury living room",
    "Modern penthouse","Dubai skyline balcony","Rooftop golden hour","Boutique interior",
    "Vanity / dressing table","Bathroom marble counter","Bedroom soft morning","Garden / florals",
    "Desert dunes","Beach / coastal","Poolside luxury","Cafe / lifestyle","Art gallery","Hotel suite",
    "Silk/satin drape backdrop","Velvet backdrop","Stone/concrete textured","Wooden warm table",
    "Reflective glass surface","Water ripple surface","Floral arrangement set","Seasonal (Ramadan/Eid)",
    "Christmas/holiday","Abstract gradient","Color-block brand set","Outdoor terrace","Spa / wellness",
    "Runway / fashion"
  ];
  const LIGHTING = [
    "Soft diffused","Bright airy","Golden hour","Natural window light","Studio softbox","High-key white",
    "Low-key dramatic","Rembrandt","Butterfly/beauty light","Backlit/halo","Rim light","Warm tungsten",
    "Cool daylight","Candlelit","Neon accent","Spotlight","Gradient background light",
    "Hard shadow editorial","Side light","Top light","Ring-light glow","Sunset warm","Overcast even",
    "Moody chiaroscuro","Color gel (brand)","Reflected fill","Dappled/leaf shadow","Glossy reflective",
    "Matte even","Cinematic teal-orange","Soft pink glow","Luxury amber"
  ];
  // Color palettes get swatches so the client sees the dominant tone they're picking
  const PALETTES = [
    { label: "Brand colors", swatch: "linear-gradient(90deg,#000,#fff)" },
    { label: "Nude/neutral", swatch: "#D4B79A" }, { label: "Black & gold", swatch: "linear-gradient(90deg,#000 50%,#D4AF37 50%)" },
    { label: "White & gold", swatch: "linear-gradient(90deg,#fff 50%,#D4AF37 50%)" },
    { label: "Rose gold", swatch: "#B76E79" }, { label: "Champagne", swatch: "#F7E7CE" },
    { label: "Pastel pink", swatch: "#FFD1DC" }, { label: "Blush", swatch: "#DE9CA1" },
    { label: "Burgundy", swatch: "#800020" }, { label: "Deep red", swatch: "#A91B0D" },
    { label: "Emerald green", swatch: "#046307" }, { label: "Sapphire blue", swatch: "#0F52BA" },
    { label: "Navy", swatch: "#000080" }, { label: "Teal", swatch: "#008080" },
    { label: "Lavender", swatch: "#B57EDC" }, { label: "Lilac", swatch: "#C8A2C8" },
    { label: "Cream/ivory", swatch: "#FFFDD0" }, { label: "Beige/sand", swatch: "#E0C49A" },
    { label: "Terracotta", swatch: "#C56A4D" }, { label: "Mustard", swatch: "#D4A300" },
    { label: "Coral", swatch: "#FF7F50" }, { label: "Monochrome white", swatch: "#FFFFFF" },
    { label: "Monochrome black", swatch: "#0A0A0A" },
    { label: "Jewel tones", swatch: "linear-gradient(90deg,#046307,#0F52BA,#800020)" },
    { label: "Earth tones", swatch: "linear-gradient(90deg,#8B6F47,#C19A6B,#3E2723)" },
    { label: "Metallic silver", swatch: "#C0C0C0" }, { label: "Copper/bronze", swatch: "#B87333" },
    { label: "Pearl/iridescent", swatch: "linear-gradient(90deg,#F8F8FF,#E6E6FA,#FFEFD5)" },
    { label: "Soft grey", swatch: "#BEBEBE" }, { label: "Forest green", swatch: "#228B22" },
    { label: "Plum", swatch: "#8E4585" }, { label: "Peach", swatch: "#FFCBA4" }
  ];
  const NAIL_STYLES = [
    "Bare natural","Clear gloss","Nude","Soft pink","French","Red classic","Burgundy","Deep plum",
    "White","Black","Almond","Oval","Square","Coffin","Short natural","Long elegant","Metallic","Chrome",
    "Glitter accent","Matte","Neutral beige","Mauve","Coral","Henna-adorned","Minimal art","Gold accent",
    "Pearl","Rose","Taupe","Milky white"
  ];

  // ---------- shared sections (used by every pack) ----------
  const SHARED = {

    identity: {
      title: "Project Identity",
      intro: "Who's the brand, who approves, and what's the goal for this batch. → Fill this WITH the client on an onboarding call, not by sending the link for them to fill alone.",
      fields: [
        { key: "businessName", label: "Business / trading name", type: "text", required: true },
        { key: "contactName",  label: "Primary contact (name + role)", type: "text", required: true },
        { key: "contactChannel", label: "Best contact channel", type: "select", options: ["WhatsApp","Email","Phone","Other"] },
        { key: "contactLanguage", label: "Preferred language", type: "select", options: ["English","Arabic","Persian / Farsi","Mixed"] },
        { key: "approver", label: "Approver — the single person who gives the final yes", type: "text", required: true, critical: true,
          help: "Multiple approvers = revision loops. One name only." },
        { key: "campaignGoal", label: "Campaign goal for this batch", type: "select", required: true,
          options: ["Awareness","Sales","Product launch","Re-launch","Seasonal push","Always-on content","Other"] },
        { key: "targetAudience", label: "Target audience (in one sentence)", type: "textarea", required: true,
          placeholder: "e.g. UAE women 25–40, premium taste, Instagram-first" },
        { key: "tier", label: "Tier purchased", type: "select", required: true,
          options: ["Starter","Growth","Pro","Premium"] },
        { key: "videoCount", label: "Number of videos in this batch", type: "number", required: true, min: 1 },
        { key: "deadline", label: "Delivery deadline", type: "date", required: true },
        { key: "rushFlag", label: "Rush job?", type: "select", options: ["No","Yes — confirm rush surcharge"] },
      ]
    },

    format: {
      title: "Format & Technical",
      intro: "The container the video lives in. Wrong here means re-rendering everything.",
      fields: [
        { key: "aspectRatio", label: "Aspect ratio", type: "multi", required: true, critical: true,
          options: ["9:16 (Reels / TikTok / Stories)","1:1 (feed square)","16:9 (YouTube / website)","4:5 (Instagram feed)"],
          help: "Wrong ratio = full reshoot. Pick all you need; we'll plan variants." },
        { key: "duration", label: "Duration per video", type: "multi", required: true,
          options: ["6s","10s","15s","30s","60s","Longer"] },
        { key: "resolution", label: "Resolution", type: "select",
          options: ["720p (default)","1080p","4K (premium tier only)"] },
        { key: "platforms", label: "Platforms it'll run on", type: "multi", required: true,
          options: ["Instagram Reels","TikTok","YouTube","YouTube Shorts","Meta Ads","Snapchat","Website / landing page","WhatsApp status"] },
      ]
    },

    creative: {
      title: "Creative Direction & Mood",
      intro: "The biggest source of \"this isn't what I imagined\". References kill ambiguity.",
      fields: [
        { key: "referenceLinks", label: "Reference videos (2–3 links you want us to emulate)",
          type: "textarea", required: true, critical: true,
          placeholder: "Paste TikTok / Instagram / YouTube links, one per line",
          help: "The single best fault-preventer. Words are subjective; a link is not." },
        { key: "mood", label: "Overall mood / tone", type: "select", required: true,
          options: ["Luxury","Energetic","Playful","Cinematic","Minimal","Editorial","Warm & inviting","Cool & aspirational"] },
        { key: "pacing", label: "Pacing", type: "select",
          options: ["Slow & elegant","Medium","Fast cuts","Mix"] },
        { key: "hookStyle", label: "Hook style (first 2 seconds)", type: "select", required: true, critical: true,
          options: ["Problem statement","Reveal / transformation","Question to viewer","Bold claim","Motion / kinetic"] },
        { key: "storyArc", label: "Story arc",
          type: "select",
          options: ["Hook → value → CTA","Demo","Before / after","Storytelling","Testimonial-style","Product reveal"] },
        { key: "ending", label: "Ending / call to action", type: "select",
          options: ["Logo + tagline","Offer","Shop now","Visit website","Visit store","Follow / DM","No CTA (brand only)"] },
      ]
    },

    // Single consolidated model spec — used for each model the user creates.
    // Order: Identity → Modesty (critical) → Appearance → Wardrobe & styling.
    // Every field appears exactly once across the whole spec (no duplicates).
    models: {
      title: "Models",
      intro: "Create every model that will appear in any video for this shoot. You can have one model used across all videos, or many models with different looks. On the Videos step you'll assign which models appear in which video.",
      fields: [
        // --- Identity ---
        { key: "gender", label: "Gender", type: "select",
          options: ["Female","Male","Non-binary"] },
        { key: "ageRange", label: "Age range", type: "select",
          options: ["Young adult (18–24)","25–29","30s","40s","Mature (50+)","Mixed"] },
        { key: "bodyType", label: "Body type", type: "select",
          options: ["Slim","Average","Curvy","Plus","Athletic"] },
        { key: "nationality", label: "Nationality / look", type: "select", options: NATIONALITIES,
          help: "Pick the look that resonates with the audience's self-image." },

        // --- Modesty & cultural (critical block) ---
        { key: "hijab", label: "Head covering", type: "select", critical: true,
          options: ["No hijab","Hijab","Shayla","Turban","Niqab"],
          help: "Never assumed. Always asked. If unsure, ask the brand owner directly." },
        { key: "modestyLevel", label: "Modest dress level", type: "select",
          options: ["Standard (no restrictions)","Modern modest","Arms covered","Fully covered","Abaya"] },
        { key: "skinInMotion", label: "Any extra skin exposure on movement?", type: "select",
          options: ["No — strict, never extra exposure on movement","Yes — standard"],
          help: "AI can reveal skin in motion that a still doesn't. If strict we lock no-exposure rules." },
        { key: "hijabStyle", label: "Hijab style", type: "select", options: HIJAB_STYLES,
          dependsOn: { key: "hijab", notIn: ["", "No hijab"] },
          help: "Style varies a lot — pin one down or attach a reference photo in Assets." },

        // --- Appearance ---
        { key: "skinTone", label: "Skin tone", type: "select", options: SKIN_TONES },
        { key: "hair", label: "Hair (visible part — leave blank if fully covered)", type: "select", options: HAIR },
        { key: "expression", label: "Default expression / vibe", type: "select", options: EXPRESSIONS },

        // --- Wardrobe & styling (consolidated head-to-toe) ---
        { key: "wardrobe", label: "Wardrobe style (head-to-body)", type: "select", options: WARDROBE },
        { key: "makeup", label: "Makeup level", type: "select",
          options: ["Bare","Natural","Soft glam","Full glam","Editorial"] },
        { key: "nailStyle", label: "Nail style (matters for hand close-ups)", type: "select", options: NAIL_STYLES },
      ]
    },

    setting: {
      title: "Setting, Lighting & Palette",
      intro: "Where the video happens, how it's lit, and the dominant colors.",
      fields: [
        { key: "location", label: "Shoot location / setting", type: "select", required: true, options: LOCATIONS },
        { key: "lighting", label: "Lighting mood", type: "select", required: true, options: LIGHTING },
        { key: "palette", label: "Color palette", type: "select", required: true, options: PALETTES },
      ]
    },

    motionAudio: {
      title: "Motion, Camera & Audio",
      intro: "How the camera moves, how the subject moves, and what we hear.",
      fields: [
        { key: "cameraMove", label: "Camera movement", type: "select",
          options: ["Static","Slow push","Orbit","Handheld","Dynamic / multi-angle","Crane / tilt","Tracking / dolly","POV"] },
        { key: "subjectMotion", label: "Subject motion", type: "select",
          options: ["Still","Subtle","Active","Product rotation","Walking","Dancing","Hands only"] },
        { key: "speed", label: "Speed", type: "select",
          options: ["Real-time","Slow-mo","Sped-up","Mix","Time-lapse","Hyper-lapse"] },
        { key: "focus", label: "Focus style", type: "select",
          options: ["Product sharp","Depth blur (bokeh)","Rack focus","Hyperfocus / everything sharp"] },
        { key: "music", label: "Music style", type: "select",
          options: [
            "None","Luxury / cinematic","Upbeat","Ambient","Trend-based",
            "Hip-hop / trap","Electronic / EDM","Lo-fi","Pop","Classical / orchestral",
            "Acoustic","Arabic / Khaleeji","World / ethnic","Jazz","R&B / soul",
            "Rock / indie","Vocal-driven","No vocals","Sound design only"
          ] },
        { key: "voiceover", label: "Voiceover", type: "select",
          options: ["None","Female","Male","Multiple"] },
        { key: "voiceoverLanguage", label: "If VO, language & accent", type: "text",
          placeholder: "e.g. Arabic — Khaleeji, or English — neutral" },
        { key: "captions", label: "Sound-off captions", type: "select",
          options: ["Required","Optional","Not needed"], required: true,
          help: "Most social plays muted. Default to required." },
        { key: "captionLanguages", label: "Caption languages", type: "multi",
          options: ["English","Arabic","Persian / Farsi"] },
        { key: "sfx", label: "Sound effects / ASMR", type: "select",
          options: ["None","Subtle","Prominent","ASMR-focused"] },
      ]
    },

    textBranding: {
      title: "On-Screen Text & Branding",
      intro: "Every word that appears on screen, every brand element. Spelling errors after render are costly.",
      fields: [
        { key: "headline", label: "Headline / hook text (exact wording)", type: "textarea",
          placeholder: "Type the exact words. We won't paraphrase." },
        { key: "offer", label: "Offer or price (exact figures)", type: "text",
          placeholder: "e.g. 'AED 199 — this week only' — leave blank if none" },
        { key: "cta", label: "Call to action", type: "select",
          options: ["Shop now","Visit website","DM us","Book consultation","Visit store","Silent / brand only"] },
        { key: "logoPlacement", label: "Logo placement", type: "select",
          options: ["Top left","Top right","Center","Bottom","Animated entrance","No logo on screen"] },
        { key: "logoStyle", label: "Logo style", type: "select",
          options: ["Static","Animated","Subtle watermark"] },
        { key: "fontsApplied", label: "Apply brand fonts?", type: "select", options: ["Yes — supplied in assets","No — designer's choice"] },
        { key: "legalText", label: "Legal / disclaimer text required", type: "textarea",
          placeholder: "e.g. *Terms apply, *Promotional pricing valid until DD-MM-YYYY" },
      ]
    },
  };

  // ---------- per-pack definitions ----------
  return {

    // ============ JEWELRY ============
    jewelry: {
      label: "Jewelry",
      icon: "💍",
      tagline: "Close-ups, metal accuracy, exact piece, exact size.",
      heroNote: "Metal tone and the exact piece are the top misses — rose gold rendered as yellow, or the wrong ring in the shot.",
      shared: SHARED,
      product: {
        title: "Product — Jewelry Detail",
        intro: "Jewelry lives in close-ups. Metal tone, stone, and how it sits on the body must be exact.",
        fields: [
          { key: "productType", label: "Product type", type: "select", required: true, critical: true, options: [
            "Ring","Engagement ring","Wedding band","Statement ring","Stacking rings","Necklace","Pendant",
            "Choker","Layered necklaces","Studs","Hoops","Drop earrings","Chandelier earrings","Bracelet",
            "Bangle","Tennis bracelet","Cuff","Anklet","Brooch","Watch","Charm","Nose ring","Body chain",
            "Hair jewelry","Set (parure)","Pendant set","Bridal set","Men's ring","Men's bracelet",
            "Cufflinks","Gift set","Custom piece"
          ]},
          { key: "metalTone", label: "Metal tone", type: "select", required: true, critical: true, options: [
            "Yellow gold","White gold","Rose gold","Two-tone","Three-tone","Platinum","Silver","Sterling silver",
            "Vermeil","Brushed gold","Polished gold","Matte gold","18k yellow","14k yellow","24k high-shine",
            "Antique gold","Champagne gold","Black rhodium","Gunmetal","Copper","Bronze","Mixed metals",
            "Mirror polish","Hammered","Satin finish","Oxidized","Pave-set","Filigree","Brushed silver","Rose vermeil"
          ], help: "The #1 jewelry miss. Rose gold rendered as yellow is the most common error." },
          { key: "stone", label: "Stone / gem", type: "select", options: [
            "Diamond","Lab diamond","Moissanite","Emerald","Ruby","Blue sapphire","Pink sapphire","Tanzanite",
            "Aquamarine","Topaz","Amethyst","Citrine","Garnet","Opal","White pearl","Black pearl","Baroque pearl",
            "Turquoise","Onyx","Mother of pearl","Morganite","Peridot","Tourmaline","Spinel","Cubic zirconia",
            "No stone","Pave diamonds","Solitaire","Halo","Cluster","Birthstone","Mixed stones"
          ]},
          { key: "wornVsDisplayed", label: "Worn vs displayed", type: "select",
            options: ["On model","On stand","Flat lay","Both worn + displayed"] },
          { key: "bodyPlacement", label: "Body placement (close-up area)", type: "multi",
            options: ["Hand","Ear","Neck","Wrist","Décolleté","Other"] },
          { key: "stoneEmphasis", label: "Stone sparkle / light play", type: "select",
            options: ["High emphasis","Subtle","Standard"] },
          { key: "engraving", label: "Engraving visible?", type: "select",
            options: ["Not applicable","Yes — must be legible","Yes — decorative only","No"] },
        ]
      },
      sizingRows: [
        { item: "Ring", measure: "Band width, ring size, stone ct/mm", units: "size US/EU, mm, ct" },
        { item: "Necklace / chain", measure: "Chain length, pendant size, link width", units: "cm — 40/45/50cm" },
        { item: "Pendant", measure: "H × W, thickness", units: "mm" },
        { item: "Studs", measure: "Stone/face diameter", units: "mm — 6mm" },
        { item: "Drop / hoop", measure: "Total drop, hoop diameter", units: "mm — 35mm drop" },
        { item: "Bracelet / bangle", measure: "Inner diameter/wrist, width", units: "mm/cm + mm" },
        { item: "Tennis bracelet", measure: "Length, stone size", units: "cm + mm/ct" },
        { item: "Watch", measure: "Case diameter, thickness, band width, lug", units: "mm — 36mm case" },
        { item: "Cuff / anklet", measure: "Length/circumference, width", units: "cm + mm" },
        { item: "Loose stone", measure: "Carat, mm, cut", units: "ct + mm" },
        { item: "Set (parure)", measure: "Each piece + worn-together", units: "mm/cm" },
      ],
      assetExtras: [
        { asset: "Hi-res macro images", spec: "Each piece, multiple angles", why: "Close-ups demand detail" },
        { asset: "Metal tone reference", spec: "Exact tone (real photo if possible)", why: "Top miss in jewelry" },
        { asset: "Stone details", spec: "Carat, cut, color, clarity", why: "Accuracy & sparkle" },
        { asset: "On-body reference", spec: "Worn (hand/ear/neck)", why: "Placement & scale" },
        { asset: "Packaging photos", spec: "Box / pouch / case as it ships", why: "If packaging appears on screen it must match reality (Lord Milano lesson)" },
        { asset: "Certificates", spec: "GIA / authenticity if shown", why: "Trust elements" },
        { asset: "Set groupings", spec: "Pieces worn together", why: "Layering order" },
        { asset: "Engraving artwork", spec: "If detail visible", why: "Legibility" },
      ],
      preflightExtras: [
        "Exact metal tone per piece confirmed",
        "Hi-res macro images + on-body reference received",
        "Sizes + wearer reference captured",
        "Nail style & hand styling agreed",
        "Per-video piece map filled",
      ],
      faultsToAvoid: [
        "Rose gold rendered as yellow — fixed by exact metal-tone reference.",
        "Wrong piece in frame — fixed by SKU + image per video.",
        "Stone looks dull — brief sparkle/reflection emphasis.",
        "Scale wrong on body — capture wearer reference.",
        "Hands distract from piece — confirm nail style & pose.",
      ],
    },

    // ============ PERFUME ============
    perfume: {
      label: "Perfume",
      icon: "🌸",
      tagline: "The bottle and mood sell the invisible.",
      heroNote: "Scent variants share near-identical bottles — the wrong flacon is the top miss.",
      shared: SHARED,
      product: {
        title: "Product — Perfume Detail",
        intro: "Fragrance is invisible — the visuals must evoke the scent. The bottle and mood do the selling.",
        fields: [
          { key: "productType", label: "Product type", type: "select", required: true, critical: true, options: [
            "Eau de parfum","Eau de toilette","Parfum / extrait","Cologne","Body mist","Attar / oil","Oud",
            "Solid perfume","Travel size","Refillable","Gift set","Discovery set","Layering set","Unisex",
            "Men's","Women's","Niche / artisan","Designer","Room spray","Candle line","Hair mist",
            "Deodorant line","Roll-on","Tester","Limited edition","Seasonal","Bridal","Luxury flacon",
            "Minimalist bottle","Decant"
          ]},
          { key: "scentFamily", label: "Scent family to evoke", type: "select", required: true, options: [
            "Floral","White floral","Rose","Oud","Woody","Sandalwood","Cedar","Amber","Oriental","Spicy",
            "Vanilla","Gourmand","Sweet","Fruity","Citrus","Fresh / aquatic","Green","Herbal","Musky",
            "Powdery","Leather","Tobacco","Smoky","Incense","Saffron","Tropical","Marine","Chypre",
            "Fougere","Aldehydic"
          ]},
          { key: "bottleMood", label: "Bottle / visual mood", type: "select", options: [
            "Luxury gold accents","Minimalist clean","Dark & mysterious","Bright & fresh","Romantic floral",
            "Desert / oud warmth","Smoky atmospheric","Water / splash","Silk & fabric","Liquid pour",
            "Mist motion","Light refraction","Reflective surfaces","Petals falling","Smoke wisps",
            "Golden hour glow","Marble luxury","Velvet drape","Crystal focus","Ingredient styling",
            "Floating bottle","Macro droplets","Sunlit window","Candlelit","Jewel-tone","Monochrome luxe",
            "Ramadan / Eid","Holiday gifting","Abstract color","Brand-color set"
          ]},
          { key: "bottleFinish", label: "Bottle color / finish", type: "select",
            options: ["Clear","Frosted","Colored","Gradient","Metallic","Mixed across variants"] },
          { key: "capDetail", label: "Cap detail emphasis", type: "select",
            options: ["Hero shot","Show clearly","Off-frame"] },
          { key: "liquidColor", label: "Liquid colour to portray (be exact)", type: "text",
            placeholder: "e.g. amber gold, deep oud brown, pale rose pink" },
          { key: "spraymoment", label: "Show spray / mist moment?", type: "select",
            options: ["Yes — hero spray","Subtle mist","No spray shown"] },
          { key: "ingredientProps", label: "Ingredient props styled in frame?", type: "multi",
            options: ["Florals","Rose petals","Oud chips","Spices","Citrus","Fabric / silk","None"] },
          { key: "packaging", label: "Packaging / outer box", type: "select",
            options: ["Shown","Boxed reveal / unboxing","Not shown"] },
        ]
      },
      sizingRows: [
        { item: "Perfume bottle", measure: "Height, width, depth, volume", units: "ml + mm — 50/100ml" },
        { item: "Cap", measure: "Height, diameter", units: "mm" },
        { item: "Atomizer / spray", measure: "Nozzle visible height", units: "mm" },
        { item: "Travel / mini", measure: "Height, volume", units: "ml — 10/30ml" },
        { item: "Attar / oil", measure: "Height, volume, applicator", units: "ml + mm" },
        { item: "Box / packaging", measure: "H × W × D", units: "cm" },
        { item: "Gift set", measure: "Box + each bottle", units: "cm + ml" },
        { item: "Candle line", measure: "Diameter, height, weight", units: "mm + g" },
        { item: "Refill", measure: "Height, volume", units: "ml" },
      ],
      assetExtras: [
        { asset: "Bottle images", spec: "Each variant, clear & angled", why: "Variants often look alike" },
        { asset: "Volume per variant", spec: "ml of each bottle", why: "Scale accuracy" },
        { asset: "Juice color reference", spec: "Real liquid color", why: "Color must match" },
        { asset: "Cap / detail shots", spec: "Hero distinctive caps", why: "Brand signature" },
        { asset: "Scent notes", spec: "Top / heart / base", why: "Drives visual mood" },
        { asset: "Ingredient props", spec: "Florals, oud, spices", why: "Evokes scent" },
        { asset: "Packaging / outer box", spec: "Box, sleeve, inserts as it ships", why: "If packaging appears on screen it must match reality (Lord Milano lesson)" },
        { asset: "Mood references", spec: "Atmosphere wanted", why: "Conveys invisible product" },
      ],
      preflightExtras: [
        "Exact flacon + image per video",
        "Bottle volume (ml) stated per video",
        "Juice color reference received",
        "Visual mood matched to scent family",
        "Per-video bottle map filled",
      ],
      faultsToAvoid: [
        "Wrong flacon (variants look alike) — fixed by exact bottle image per video.",
        "Juice color off — confirm liquid color reference.",
        "Scale wrong — state exact ml per video.",
        "Mood doesn't match scent — map visual mood to scent family.",
        "Label distorted — flag if brand name must be legible.",
      ],
    },

    // ============ COSMETICS ============
    cosmetics: {
      label: "Cosmetics",
      icon: "💄",
      tagline: "Color and texture accuracy sell cosmetics.",
      heroNote: "Shade accuracy is the product. A swatch shown wrong = returns and bad reviews.",
      shared: SHARED,
      product: {
        title: "Product — Cosmetics Detail",
        intro: "Confirm the exact product and how it must appear. Color and texture accuracy sell cosmetics.",
        fields: [
          { key: "productType", label: "Product type", type: "select", required: true, critical: true, options: [
            "Lipstick","Liquid lipstick","Lip gloss","Lip liner","Lip oil","Foundation","Concealer","Powder",
            "Blush","Bronzer","Highlighter","Contour","Eyeshadow palette","Single eyeshadow","Mascara",
            "Eyeliner pencil","Eyeliner liquid","Brow gel","Brow pencil","Setting spray","Primer","BB/CC cream",
            "Tinted moisturizer","Serum","Moisturizer","Cleanser","Face mask","Sunscreen","Nail polish",
            "Brush set","Beauty sponge","Gift set"
          ]},
          { key: "texture", label: "Texture / finish", type: "select", required: true, options: [
            "Matte","Satin","Glossy","Dewy","Shimmer","Metallic","Cream","Powder","Liquid","Balm","Velvet",
            "Glitter","Pearl","Sheer","Full-coverage","Glow","Frosted","Chrome","Jelly","Whipped","Mousse",
            "Stick","Gel","Oil","Foam","Translucent","Buildable","Long-wear","Hydrating","Plumping"
          ]},
          { key: "makeupLook", label: "Makeup look on the model", type: "select", options: [
            "No-makeup makeup","Soft glam","Full glam","Smoky eye","Bold lip","Nude lip","Winged liner",
            "Dewy skin","Matte skin","Bronzed","Rosy cheeks","Cut crease","Halo eye","Graphic liner",
            "Glossy lids","Monochrome","Editorial","Bridal","Red carpet","Natural day","Evening drama",
            "Glitter accent","Colored mascara","Faux freckles","Glass skin","Sunset eye","Berry tones",
            "Peach tones","Gold accent","Festival"
          ]},
          { key: "exactShade", label: "Exact shade / color (name + hex if known)", type: "text", required: true, critical: true,
            placeholder: "e.g. 'Velvet Burgundy #5C1B1F'", help: "Color IS the product. Be exact." },
          { key: "swatchShown", label: "Show a swatch?", type: "select",
            options: ["On skin","On surface","Both","No swatch"] },
          { key: "applicationShown", label: "Show application?", type: "select",
            options: ["On model","Hand swatch only","Product only","Both"] },
          { key: "packagingState", label: "Packaging state in shots", type: "select",
            options: ["Open","Closed","Cap off","Mixed"] },
          { key: "labelLegible", label: "Label legibility", type: "select",
            options: ["Must be readable","Decorative only — no need to read"] },
          { key: "textureCloseup", label: "Macro / texture close-up needed?", type: "select",
            options: ["Yes","No"] },
          { key: "beforeAfter", label: "Before / after?", type: "select",
            options: ["Yes — bare vs applied","No"] },
        ]
      },
      sizingRows: [
        { item: "Lipstick / bullet", measure: "Height, diameter", units: "mm" },
        { item: "Compact / palette", measure: "H × W × D", units: "mm" },
        { item: "Foundation bottle", measure: "Height, diameter, volume", units: "mm + ml" },
        { item: "Tube (mascara, gloss)", measure: "Height, diameter", units: "mm" },
        { item: "Jar / pot", measure: "Diameter, height, volume", units: "mm + ml/g" },
        { item: "Pencil", measure: "Length, diameter", units: "mm" },
        { item: "Brush", measure: "Total length, bristle length", units: "mm" },
        { item: "Outer box", measure: "H × W × D", units: "cm" },
      ],
      assetExtras: [
        { asset: "Exact shade samples", spec: "Real swatch photo or hex code", why: "Color is the product" },
        { asset: "Product images", spec: "Each SKU, open & closed, label visible", why: "Variants & SKU accuracy" },
        { asset: "Texture macro images", spec: "Close-up of finish", why: "Texture must read on screen" },
        { asset: "Application reference", spec: "Real photo of finished look", why: "Application style matches" },
        { asset: "Skin tone target", spec: "Model skin matches buyer", why: "Audience resonance" },
        { asset: "Packaging photos", spec: "Outer box, cap, applicator, base as it ships", why: "If packaging appears on screen it must match reality (Lord Milano lesson)" },
      ],
      preflightExtras: [
        "Exact shade / hex per video confirmed",
        "Swatch reference photo received",
        "Texture / finish locked",
        "Makeup look on model matches featured products",
        "Per-video product map filled",
      ],
      faultsToAvoid: [
        "Shade off — fixed by exact hex code + reference photo.",
        "Texture flat (should be glossy / shimmer) — flag finish explicitly.",
        "Wrong SKU shown — bottle/tube/pen photo per video.",
        "Label unreadable when it must be — flag legibility.",
        "Model's makeup contradicts the featured product — match look to SKU.",
      ],
    },

    // ============ GENERIC (broad / static ads / other products) ============
    generic: {
      label: "Generic / Other",
      icon: "🎬",
      tagline: "Static ads, broad campaigns, services, or products outside the 3 niches.",
      heroNote: "Use this when the work doesn't fit Jewelry / Perfume / Cosmetics — static graphics, brand intros, services, or a mix.",
      shared: SHARED,
      product: {
        title: "Product / Subject",
        intro: "Describe what we're filming or designing. Be specific — vague briefs cause vague output.",
        fields: [
          { key: "deliverableType", label: "Type of deliverable", type: "select", required: true, critical: true, options: [
            "Static ad / graphic","Carousel post (multi-frame)","Product video","Service promo video",
            "Founder / testimonial","Event coverage","Brand intro","Explainer / how-to","UGC-style ad",
            "Voiceover-led video","Animation / motion graphics","Print-style banner"
          ]},
          { key: "productName", label: "Product or service name", type: "text", required: true },
          { key: "productDesc", label: "Describe it in one sentence", type: "textarea", required: true,
            placeholder: "What is it, what does it do, who is it for" },
          { key: "uniqueAngle", label: "What makes it different from competitors?", type: "textarea" },
          { key: "keyMessage", label: "The single message we want the viewer to remember", type: "text", required: true,
            placeholder: "e.g. \"30-day money-back guarantee\"" },
          { key: "visualSignature", label: "Visual signature / hero element", type: "text",
            placeholder: "e.g. logo lockup, packaging close-up, founder face, product in hand" },
          { key: "physicalReference", label: "Is there a physical product?", type: "select",
            options: ["Yes — physical product","No — service / digital","Mixed"] },
        ]
      },
      sizingRows: [
        { item: "Physical product", measure: "Best-fit dimensions if applicable", units: "mm / cm / ml / kg" },
        { item: "Packaging", measure: "Box / sleeve dimensions", units: "cm" },
        { item: "Static ad format", measure: "Output size", units: "px (1080×1080, 1080×1920, etc.)" },
      ],
      assetExtras: [
        { asset: "Reference images", spec: "Hi-res, multiple angles or moments", why: "Foundation of every shot" },
        { asset: "Product packaging", spec: "Box / wrap / case if shown", why: "Must match real-life packaging" },
        { asset: "Brand assets", spec: "Logos, fonts, palette", why: "Output stays on-brand" },
        { asset: "Existing campaign references", spec: "What you've done before that worked", why: "Tone calibration" },
      ],
      preflightExtras: [
        "Deliverable type confirmed (static / video / mix)",
        "Reference images received",
        "Key message locked in writing",
        "Brand assets received",
      ],
      faultsToAvoid: [
        "Vague description — no specifics for AI to work from.",
        "No real-world reference — risks wrong scale, wrong vibe, generic output.",
        "Key message not agreed — different team members chase different angles.",
        "Brand assets missing — output is off-brand and needs full redo.",
      ],
    },
  };

})();
