import pandas as pd

# Path to Person 1's processed training dataset
data_path = "data/processed/train_eta_training.csv"

# Load the dataset
df = pd.read_csv(data_path)

# 1. Dataset size
print("=" * 60)
print("DATASET OVERVIEW")
print("=" * 60)

print("Dataset shape:", df.shape)
print("Rows:", df.shape[0])
print("Columns:", df.shape[1])


# 2. Column names
print("\n" + "=" * 60)
print("COLUMN NAMES")
print("=" * 60)

for column in df.columns:
    print(column)


# 3. Data types
print("\n" + "=" * 60)
print("DATA TYPES")
print("=" * 60)

print(df.dtypes)


# 4. Missing values
print("\n" + "=" * 60)
print("MISSING VALUES")
print("=" * 60)

missing = df.isnull().sum()

print(missing)

print("\nTotal missing values:", missing.sum())


# 5. Duplicate rows
print("\n" + "=" * 60)
print("DUPLICATES")
print("=" * 60)

duplicates = df.duplicated().sum()

print("Duplicate rows:", duplicates)


# 6. First five rows
print("\n" + "=" * 60)
print("FIRST 5 ROWS")
print("=" * 60)

print(df.head())


# 7. Target variable analysis
print("\n" + "=" * 60)
print("TARGET VARIABLE")
print("=" * 60)

target = "target_delay_next_station"

print("Target column:", target)

print("\nTarget statistics:")
print(df[target].describe())


# 8. Unique values in important columns
print("\n" + "=" * 60)
print("IMPORTANT COLUMN INFORMATION")
print("=" * 60)

for column in ["train_number", "station_code", "station_sequence"]:
    if column in df.columns:
        print(f"\n{column}:")
        print("Unique values:", df[column].nunique())


# 9. Target value counts
print("\n" + "=" * 60)
print("TARGET VALUE DISTRIBUTION")
print("=" * 60)

print(df[target].value_counts().head(20))


print("\n" + "=" * 60)
print("DATA EXPLORATION COMPLETED")
print("=" * 60)