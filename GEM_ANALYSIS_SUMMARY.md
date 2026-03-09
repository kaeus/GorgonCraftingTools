# Project Gorgon Gem/Crystal Analysis Summary

## Overview
- **Total Gem/Crystal items found:** 690 (items with "Crystal", "Gem", "Jewel", or "Gemstone" keywords)
- **Gems with skill associations:** 44
- **Unique Primary Skills supported:** 22
- **Unique Secondary Skills supported:** 8

---

## Skill → Gem Mapping

### Primary Skills with Associated Gems (22 Skills)

| Skill | Regular Gems | Massive Gems | Count |
|-------|-------------|-------------|-------|
| **Alchemy** (Secondary) | Lapis Lazuli | Massive Lapis Lazuli | - |
| **Animal Handling** | Fluorite | Massive Fluorite | 2 |
| **Archery** | Peridot | Massive Peridot | 2 |
| **Bard** | Azurite | Massive Azurite | 2 |
| **Battle Chemistry** | Citrine | Massive Citrine | 2 |
| **Druid** | Garnet | Massive Garnet | 2 |
| **Fire Magic** | Quartz | Massive Quartz | 2 |
| **Fishing** | Aquamarine | Massive Aquamarine | 2 |
| **Geology** (Secondary) | Tsavorite | Massive Tsavorite | - |
| **Hammer** | Moss Agate | Massive Moss Agate | 2 |
| **Ice Magic** | Tsavorite | Massive Tsavorite | 2 |
| **Knives** | Obsidian | Massive Obsidian | 2 |
| **Lycanthropy** | Moonstone | Massive Moonstone | 2 |
| **Meditation** (Secondary) | Fluorite | Massive Fluorite | - |
| **Mentalism** | Topaz | Massive Topaz | 2 |
| **Necromancy** | Serpentine | Massive Serpentine | 2 |
| **Priest** | Lapis Lazuli | Massive Lapis Lazuli | 2 |
| **Psychology** | Tourmaline | Massive Tourmaline | 2 |
| **Shield** | Onyx | Massive Onyx | 2 |
| **Staff** | Blue Spinel | Massive Blue Spinel | 2 |
| **Sword** | Carnelian | Massive Carnelian | 2 |
| **Tailoring** (Secondary) | Sardonyx | Massive Sardonyx | - |
| **Teleportation** | Amethyst, Aquamarine | Massive Amethyst, Massive Aquamarine | 4 |
| **Toolcrafting** (Secondary) | Obsidian | Massive Obsidian | - |
| **Unarmed** | Agate | Massive Agate | 2 |
| **Warden** | Sardonyx | Massive Sardonyx | 2 |
| **Weather Witching** | Bloodstone | Massive Bloodstone | 2 |

---

## Gem → Skill Mapping

### Complete Gem Details

#### Standard Gems
1. **Agate** → Primary: Unarmed
2. **Amethyst** → Primary: Teleportation
3. **Aquamarine** → Primary: Fishing, Secondary: Teleportation
4. **Azurite** → Primary: Bard
5. **Bloodstone** → Primary: Weather Witching
6. **Blue Spinel** → Primary: Staff
7. **Carnelian** → Primary: Sword
8. **Citrine** → Primary: Battle Chemistry
9. **Fluorite** → Primary: Animal Handling, Secondary: Meditation
10. **Garnet** → Primary: Druid, Secondary: First Aid
11. **Lapis Lazuli** → Primary: Priest, Secondary: Alchemy
12. **Moonstone** → Primary: Lycanthropy
13. **Moss Agate** → Primary: Hammer
14. **Obsidian** → Primary: Knives, Secondary: Toolcrafting
15. **Onyx** → Primary: Shield
16. **Peridot** → Primary: Archery, Secondary: Calligraphy
17. **Quartz** → Primary: Fire Magic
18. **Sardonyx** → Primary: Warden, Secondary: Tailoring
19. **Serpentine** → Primary: Necromancy
20. **Topaz** → Primary: Mentalism
21. **Tourmaline** → Primary: Psychology
22. **Tsavorite** → Primary: Ice Magic, Secondary: Geology

#### Massive Gems (Higher tier versions of the above)
- Massive versions exist for all standard gems listed above
- All maintain the same primary and secondary skill associations

---

## Primary Skills Summary (22 Total)

**With 2 gems each (including Massive versions):**
- Animal Handling
- Archery
- Bard
- Battle Chemistry
- Druid
- Fire Magic
- Fishing
- Hammer
- Ice Magic
- Knives
- Lycanthropy
- Mentalism
- Necromancy
- Priest
- Psychology
- Shield
- Staff
- Sword
- Unarmed
- Warden
- Weather Witching

**With 4 gems (including Massive versions):**
- **Teleportation** (Amethyst, Aquamarine, Massive Amethyst, Massive Aquamarine)

---

## Secondary Skills Summary (8 Total)

Skills that appear only as secondary associations:
1. **Alchemy** - (Lapis Lazuli / Priest)
2. **Calligraphy** - (Peridot / Archery)
3. **First Aid** - (Garnet / Druid)
4. **Geology** - (Tsavorite / Ice Magic)
5. **Meditation** - (Fluorite / Animal Handling)
6. **Tailoring** - (Sardonyx / Warden)
7. **Teleportation** - (Aquamarine / Fishing, Massive Aquamarine / Fishing)
8. **Toolcrafting** - (Obsidian / Knives)

---

## Notes for Implementation

### Key Observations:
1. **Massive gems** are direct equivalents of standard gems with identical skill associations
2. **Teleportation** is unique as it's a primary skill with 4 gems and also appears as secondary
3. Each primary skill (except Teleportation) has exactly 2 gem options (standard + massive)
4. **22 Primary Skills** provide good coverage of Project Gorgon's crafting disciplines
5. **8 Secondary Skills** offer crafters strategic choices for skill development

### Data Structure Recommendation:
```json
{
  "gems": {
    "gem_name": {
      "id": "item_id",
      "primary_skill": "Skill Name",
      "secondary_skill": "Skill Name or null",
      "icon_id": "icon_number",
      "is_massive": false
    }
  },
  "skills": {
    "skill_name": {
      "primary_gems": ["Gem1", "Gem2"],
      "secondary_gems": ["Gem1", "Gem2"] 
    }
  }
}
```

### Icon ID Reference:
Each gem has a unique IconId that can be used for UI display:
- Standard gems: Icon IDs range from 5200-5220
- Massive gems: Icon IDs range from 6861-6884

---

## Extracted from
- **Source:** Project Gorgon CDN (https://cdn.projectgorgon.com/v461/data/items.json)
- **Analysis Date:** March 9, 2026
- **Total Items Analyzed:** 690 (all gems/crystals)
- **Gems with Skills:** 44 (22 base + 22 massive variants)
