import pandas as pd

file = r"/Users/ander/北京工商大学/M1/信息可视化/实验一/automobile_clean.csv"
df = pd.read_csv(file)

print("=" * 60)
print("1. 数据集基本信息")
print("=" * 60)
print("记录数：", len(df))
print("属性数：", len(df.columns))
print("\n字段名称：")
print(df.columns.tolist())

print("\n" + "=" * 60)
print("2. 数据类型")
print("=" * 60)
print(df.dtypes)

print("\n" + "=" * 60)
print("3. 数值型属性统计")
print("=" * 60)
print(df.describe().round(2))

print("\n" + "=" * 60)
print("4. 主要类别属性")
print("=" * 60)

for col in ["make", "fuel-type", "aspiration", "body-style", "drive-wheels", "engine-location"]:
    print(f"\n{col}：")
    print(df[col].value_counts())

print("\n" + "=" * 60)
print("5. 价格相关性")
print("=" * 60)

numeric = df.select_dtypes(include="number")
corr = numeric.corr()["price"].sort_values(ascending=False)

print(corr.round(3))