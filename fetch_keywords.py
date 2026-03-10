import json
import requests
from collections import Counter

# Fetch the JSON file from the CDN
url = "https://cdn.projectgorgon.com/v461/data/items.json"

try:
    print("Fetching JSON file from CDN...")
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    print(f"Successfully fetched JSON. Processing {len(data)} items...")
except requests.exceptions.RequestException as e:
    print(f"Error fetching the file: {e}")
    exit(1)
except json.JSONDecodeError as e:
    print(f"Error parsing JSON: {e}")
    exit(1)

# Extract all keywords
all_keywords = []

for item_id, item in data.items():
    if isinstance(item, dict) and 'Keywords' in item:
        keywords = item['Keywords']
        if isinstance(keywords, list):
            all_keywords.extend(keywords)
        elif isinstance(keywords, str):
            all_keywords.append(keywords)

# Count keyword frequencies
keyword_counts = Counter(all_keywords)

# Filter keywords that appear more than 10 times
filtered_keywords = {k: v for k, v in keyword_counts.items() if v > 10}

# Sort alphabetically
sorted_keywords = sorted(filtered_keywords.items())

# Print results
print(f"\nTotal unique keywords found: {len(keyword_counts)}")
print(f"Keywords with frequency > 10: {len(sorted_keywords)}\n")

print("Alphabetically sorted keywords with frequency > 10:")
print("=" * 50)

for keyword, count in sorted_keywords:
    print(f"{keyword}: {count}")

# Save to file as well
output_file = "extracted_keywords_filtered.txt"
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("Keywords with frequency > 10 (alphabetically sorted):\n")
    f.write("=" * 50 + "\n\n")
    for keyword, count in sorted_keywords:
        f.write(f"{keyword}: {count}\n")

print(f"\n✓ Results saved to {output_file}")
