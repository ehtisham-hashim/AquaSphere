import re

with open('prisma/schema.prisma', 'r') as f:
    schema = f.read()

def add_indexes(model_name, schema_name, indexes):
    global schema
    # Find the block for the model
    # Matches: model ModelName { ... @@map("table_name") @@schema("schema_name") }
    pattern = rf'model\s+{model_name}\s+{{[^}}]*?@@map\("([^"]+)"\)\s*@@schema\("{schema_name}"\)[^}}]*?}}'
    
    def replacer(match):
        block = match.group(0)
        # Check if already has the indexes
        if all(idx in block for idx in indexes):
            return block
        
        # Insert indexes right before @@map
        idx_str = '\n'.join(f'  {idx}' for idx in indexes)
        new_block = re.sub(rf'(\s*@@map\("[^"]+"\))', f'\n{idx_str}\\1', block)
        return new_block

    schema = re.sub(pattern, replacer, schema)

# Aquasphere
add_indexes('AquasphereItem', 'aquasphere', ['@@index([name])', '@@index([type])'])
add_indexes('AquasphereVendor', 'aquasphere', ['@@index([name])'])
add_indexes('AquasphereUser', 'aquasphere', ['@@index([role])', '@@index([isActive])'])
add_indexes('AquasphereOrder', 'aquasphere', ['@@index([deliveryStatus, paymentStatus])'])
add_indexes('AquasphereSpotSale', 'aquasphere', ['@@index([customerId, createdAt(sort: Desc)])'])

# Wadaana
add_indexes('WadaanaItem', 'wadaana', ['@@index([name])', '@@index([type])'])
add_indexes('WadaanaVendor', 'wadaana', ['@@index([name])'])
add_indexes('WadaanaOrder', 'wadaana', ['@@index([deliveryStatus, paymentStatus])'])
add_indexes('WadaanaSpotSale', 'wadaana', ['@@index([customerId, createdAt(sort: Desc)])'])
# No WadaanaUser

with open('prisma/schema.prisma', 'w') as f:
    f.write(schema)
