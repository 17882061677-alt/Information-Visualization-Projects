import pandas as pd
import numpy as np

input_file = r"/Users/ander/北京工商大学/M1/信息可视化/实验一/automobile/imports-85.data"
output_file = r"/Users/ander/北京工商大学/M1/信息可视化/实验一/automobile_clean.csv"

columns = [
    "symboling", "normalized-losses", "make", "fuel-type", "aspiration",
    "num-of-doors", "body-style", "drive-wheels", "engine-location",
    "wheel-base", "length", "width", "height", "curb-weight",
    "engine-type", "num-of-cylinders", "engine-size", "fuel-system",
    "bore", "stroke", "compression-ratio", "horsepower", "peak-rpm",
    "city-mpg", "highway-mpg", "price"
]

df = pd.read_csv(input_file, names=columns, na_values="?")

numeric_cols = [
    "symboling", "normalized-losses", "wheel-base", "length", "width",
    "height", "curb-weight", "engine-size", "bore", "stroke",
    "compression-ratio", "horsepower", "peak-rpm", "city-mpg",
    "highway-mpg", "price"
]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

print("原始数据规模：", df.shape)
print("\n各字段缺失值数量：")
print(df.isnull().sum())

# price 是后续核心分析指标，因此价格缺失的汽车直接删除
df = df.dropna(subset=["price"])

# 数值型缺失值使用该字段中位数填充
for col in numeric_cols:
    if df[col].isnull().any():
        df[col] = df[col].fillna(df[col].median())

# 类别型缺失值使用众数填充
for col in df.select_dtypes(include="object").columns:
    if df[col].isnull().any():
        df[col] = df[col].fillna(df[col].mode()[0])

df.to_csv(output_file, index=False, encoding="utf-8-sig")

print("\n清洗后数据规模：", df.shape)
print("剩余缺失值：", df.isnull().sum().sum())
print("\n前5条数据：")
print(df.head())
print("\n已生成：", output_file)