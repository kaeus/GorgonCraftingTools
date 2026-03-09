#!/usr/bin/env python3
"""
Analyze Project Gorgon gems and crystals from items.json
"""

import json
import re
from collections import defaultdict
from urllib.request import urlopen, Request

def fetch_items():
    """Fetch items.json from Project Gorgon CDN"""
    url = "https://cdn.projectgorgon.com/v461/data/items.json"
    print(f"Fetching from {url}...")
    try:
        request = Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urlopen(request) as response:
            data = json.loads(response.read().decode('utf-8'))
        return data
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def extract_skills_from_description(description):
    """
    Parse description to extract Primary Skill and Secondary Skill
    Try multiple patterns including:
    - "Primarily used for <skill>" pattern
    - "Associated Primary Skill:" pattern
    - "Associated.*Skill:" patterns
    """
    if not description:
        return None, None
    
    primary_skill = None
    secondary_skill = None
    
    # Try to find "Primarily used for <skill>" pattern
    primary_match = re.search(r'Primarily used for (.+?)(?:\.|,|;|Can)', description, re.IGNORECASE)
    if primary_match:
        primary_skill = primary_match.group(1).strip().rstrip('.')
    
    # Try to find "Associated Primary Skill:" pattern
    if not primary_skill:
        assoc_primary = re.search(r'Associated Primary Skill:\s*([A-Za-z\s]+?)(?:\n|$)', description, re.IGNORECASE)
        if assoc_primary:
            primary_skill = assoc_primary.group(1).strip()
    
    # Try to find "Associated.*Skill:" pattern
    if not primary_skill:
        assoc_skill = re.search(r'Associated\s+\w+\s+Skill:\s*([A-Za-z\s]+?)(?:\n|$)', description, re.IGNORECASE)
        if assoc_skill:
            primary_skill = assoc_skill.group(1).strip()
    
    # Try to find "Can also be used for <skill>" pattern
    secondary_match = re.search(r'Can also be used for (.+?)(?:\.|;|$)', description, re.IGNORECASE)
    if secondary_match:
        secondary_skill = secondary_match.group(1).strip().rstrip('.')
    
    # Try to find "Associated Secondary Skill:" pattern
    if not secondary_skill:
        assoc_secondary = re.search(r'Associated Secondary Skill:\s*([A-Za-z\s]+?)(?:\n|$)', description, re.IGNORECASE)
        if assoc_secondary:
            secondary_skill = assoc_secondary.group(1).strip()
    
    return primary_skill, secondary_skill

def analyze_gems(items_data):
    """
    Find and analyze all gem/crystal items
    """
    if not items_data:
        print("No data available")
        return
    
    # Keywords to search for
    gem_keywords = {'Crystal', 'Gem', 'Jewel', 'Gemstone'}
    
    gems = {}
    skill_to_gems = defaultdict(list)
    gem_to_skills = defaultdict(lambda: {'primary': None, 'secondary': None})
    all_primary_skills = set()
    all_secondary_skills = set()
    
    # Iterate through items
    for item_id, item_data in items_data.items():
        if not isinstance(item_data, dict):
            continue
        
        # Check if item has gem-related keywords
        keywords = item_data.get('Keywords', [])
        if not isinstance(keywords, list):
            keywords = [keywords] if keywords else []
        
        # Check if any keyword matches gem patterns
        has_gem_keyword = any(
            any(gk.lower() in kw.lower() for gk in gem_keywords)
            for kw in keywords
        )
        
        if has_gem_keyword:
            name = item_data.get('Name', 'Unknown')
            description = item_data.get('Description', '')
            icon_id = item_data.get('IconId', 'N/A')
            
            primary_skill, secondary_skill = extract_skills_from_description(description)
            
            gems[name] = {
                'id': item_id,
                'keywords': keywords,
                'description': description,
                'icon_id': icon_id,
                'primary_skill': primary_skill,
                'secondary_skill': secondary_skill
            }
            
            # Build mappings
            if primary_skill:
                skill_to_gems[primary_skill].append(name)
                all_primary_skills.add(primary_skill)
            
            if secondary_skill:
                all_secondary_skills.add(secondary_skill)
                if secondary_skill not in skill_to_gems[primary_skill] if primary_skill else secondary_skill:
                    skill_to_gems[secondary_skill].append(name)
            
            gem_to_skills[name] = {
                'primary': primary_skill,
                'secondary': secondary_skill
            }
    
    # Print results
    print("\n" + "="*80)
    print(f"FOUND {len(gems)} GEM/CRYSTAL ITEMS")
    print("="*80)
    
    # Show sample gems with descriptions for analysis
    print("\n### SAMPLE GEM DESCRIPTIONS (First 20) ###\n")
    for idx, (gem_name, gem_info) in enumerate(sorted(gems.items())[:20]):
        print(f"{idx+1}. {gem_name}")
        print(f"   Keywords: {', '.join(gem_info['keywords'][:5])}")  # Show first 5 keywords
        print(f"   Description: {gem_info['description'][:100]}...")
        print(f"   Primary: {gem_info['primary_skill']}, Secondary: {gem_info['secondary_skill']}")
        print()
    
    # Detailed gem listing (only gems with skills)
    gems_with_skills = {k: v for k, v in gems.items() if v['primary_skill'] or v['secondary_skill']}
    print(f"\n### GEMS WITH ASSOCIATED SKILLS ({len(gems_with_skills)}) ###\n")
    for gem_name in sorted(gems_with_skills.keys()):
        gem_info = gems[gem_name]
        print(f"Gem: {gem_name}")
        print(f"  ID: {gem_info['id']}")
        print(f"  Keywords: {', '.join(gem_info['keywords'])}")
        print(f"  Icon ID: {gem_info['icon_id']}")
        print(f"  Description: {gem_info['description']}")
        print(f"  Primary Skill: {gem_info['primary_skill']}")
        print(f"  Secondary Skill: {gem_info['secondary_skill']}")
        print()
    
    # Skill to gems mapping
    print("\n### SKILL -> GEM MAPPING ###\n")
    for skill in sorted(skill_to_gems.keys()):
        gems_list = sorted(set(skill_to_gems[skill]))
        print(f"{skill}:")
        for gem in gems_list:
            print(f"  - {gem}")
    
    # Gem to skills mapping
    print("\n### GEM -> SKILL(S) MAPPING ###\n")
    for gem in sorted(gem_to_skills.keys()):
        skills = gem_to_skills[gem]
        if skills['primary'] or skills['secondary']:
            print(f"{gem}:")
            print(f"  Primary: {skills['primary']}")
            if skills['secondary']:
                print(f"  Secondary: {skills['secondary']}")
    
    # Summary of unique skills
    print("\n### UNIQUE PRIMARY SKILLS AND ASSOCIATED GEMS ###\n")
    print(f"Total Unique Primary Skills: {len(all_primary_skills)}\n")
    if all_primary_skills:
        for skill in sorted(all_primary_skills):
            gems_list = sorted(set(skill_to_gems[skill]))
            print(f"{skill}: {len(gems_list)} gems")
            for gem in gems_list:
                print(f"  - {gem}")
    else:
        print("No primary skills found in gem descriptions.")
    
    # Unique secondary skills
    print("\n### UNIQUE SECONDARY SKILLS ###\n")
    if all_secondary_skills:
        print(f"Total Unique Secondary Skills: {len(all_secondary_skills)}\n")
        for skill in sorted(all_secondary_skills):
            print(f"  - {skill}")
    else:
        print("No secondary skills found in gem descriptions.")
    
    # Export as JSON for easy integration
    print("\n### JSON EXPORT ###\n")
    export_data = {
        'total_gems_found': len(gems),
        'gems_with_skills': len(gems_with_skills),
        'gems': {k: v for k, v in gems.items() if v['primary_skill'] or v['secondary_skill']},
        'skill_to_gems': {k: sorted(set(v)) for k, v in skill_to_gems.items()},
        'gem_to_skills': {k: v for k, v in gem_to_skills.items() if v['primary'] or v['secondary']},
        'primary_skills': sorted(all_primary_skills),
        'secondary_skills': sorted(all_secondary_skills)
    }
    print(json.dumps(export_data, indent=2))


if __name__ == '__main__':
    items_data = fetch_items()
    analyze_gems(items_data)
