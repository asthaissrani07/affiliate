import json

with open("props_dump.json", "r", encoding="utf-8") as f:
    props = json.load(f)

affiliates_data = props.get("affiliates", {}).get("data", [])
print(f"Number of affiliates in data: {len(affiliates_data)}")

if affiliates_data:
    first_item = affiliates_data[0]
    print("\nKeys of an affiliate item:")
    print(list(first_item.keys()))
    print("\nFirst item details:")
    print(json.dumps(first_item, indent=2))
    
    # Save first 20 to scraped_data.json
    first_20 = affiliates_data[:20]
    with open("scraped_data.json", "w", encoding="utf-8") as out:
        json.dump(first_20, out, indent=2)
    print("\nFirst 20 items saved to scraped_data.json")
else:
    print("No affiliates found in data.")
