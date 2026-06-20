import json

with open("props_dump.json", "r", encoding="utf-8") as f:
    props = json.load(f)

print("Title:", props.get("title"))
print("AppName:", props.get("appName"))
print("AppUrl:", props.get("appUrl"))
print("Total Affiliates:", props.get("totalAffiliates"))
print("Total Networks:", props.get("totalNetworks"))
print("Total Categories:", props.get("totalCategories"))
print("Total Promos:", props.get("totalPromos"))

print("\nFeatured Affiliates:")
for aff in props.get("affiliatesFeatured", []):
    print(f" - {aff.get('name')}: {aff.get('teaser_affiliate')}")

print("\nCategories (Sample):")
for cat in props.get("categories", [])[:5]:
    print(f" - {cat.get('name')}: {cat.get('affiliates_count')} affiliates")

print("\nNetworks (Sample):")
for net in props.get("networks", [])[:5]:
    print(f" - {net.get('name')}: {net.get('affiliates_count')} affiliates")

print("\nPayment Methods (Sample):")
for pm in props.get("paymentMethods", [])[:5]:
    print(f" - {pm.get('name')}: {pm.get('affiliates_count')} affiliates")
