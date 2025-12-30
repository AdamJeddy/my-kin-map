# Test Data for My Kin Map

This folder contains sample data files for testing the import functionality of the My Kin Map application.

## Files

### sample-family.json
A JSON backup file containing a sample 4-generation family tree:

**The Smith Family:**
```
William Smith (1920-1995) ─┬─ Elizabeth Davis (1922-2010)
                          │
                          └── John Smith (1950) ─┬─ Mary Johnson (1952)
                                                 │
                              ┌──────────────────┴──────────────────┐
                              │                                     │
                    Robert Smith (1975) ─┬─ Sarah Williams (1978)   Emily Smith (1980) ─┬─ Michael Brown (1979)
                                         │                                              │
                              ┌──────────┴──────────┐                                   │
                              │                     │                                   │
                        Emma Smith (2005)    James Smith (2008)                  Olivia Brown (2010)
```

**Contains:**
- 11 persons across 4 generations
- 4 family units with marriage dates and places
- 1 family tree definition

### sample-family.ged
A GEDCOM 5.5.1 format file with the same family data. This is the industry-standard format for exchanging genealogical data between different family tree applications.

## How to Test

### JSON Import
1. Open the app at http://localhost:5173/
2. Go to Settings (gear icon)
3. Click "Import from Backup"
4. Select `sample-family.json`
5. The family tree should appear on the Tree page

### GEDCOM Import
1. Open the app at http://localhost:5173/
2. Go to Settings (gear icon)
3. Click "Import GEDCOM"
4. Select `sample-family.ged`
5. The family tree should appear on the Tree page

## Expected Result
After importing either file, you should see:
- 11 people in the Search page
- A connected family tree visualization on the Tree page
- John Smith as the default root person
- Proper parent-child and spouse connections
