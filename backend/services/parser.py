import pandas as pd
from io import BytesIO

def parse_file(file_bytes: bytes, filename: str) -> tuple[pd.DataFrame, list[dict], str | None, str | None]:
    """
    Parse uploaded Excel/CSV into a DataFrame and auto-detect schema.
    Returns: (dataframe, schema_list, id_col, name_col)
    """
    if filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(file_bytes))
    else:
        df = pd.read_excel(BytesIO(file_bytes))

    schema = []
    for col in df.columns:
        dtype = df[col].dtype
        col_info = {"name": col}

        if pd.api.types.is_numeric_dtype(dtype):
            col_info["type"] = "numeric"
            col_info["min"] = float(df[col].min())
            col_info["max"] = float(df[col].max())
            col_info["mean"] = float(df[col].mean())
            col_info["sum"] = float(df[col].sum())

        elif pd.api.types.is_datetime64_any_dtype(dtype) or "date" in col.lower():
            col_info["type"] = "datetime"
            try:
                df[col] = pd.to_datetime(df[col])
                col_info["min"] = str(df[col].min())
                col_info["max"] = str(df[col].max())
            except:
                col_info["type"] = "text"

        else:
            unique_vals = df[col].dropna().unique().tolist()
            if len(unique_vals) <= max(20, len(df) * 0.05):
                col_info["type"] = "categorical"
                col_info["unique_values"] = [str(v) for v in unique_vals[:50]]
            else:
                col_info["type"] = "text"

        schema.append(col_info)

    # Try to detect the "ID" and "Name" column automatically
    id_col = next((c["name"] for c in schema if "id" in c["name"].lower()), None)
    name_col = next((c["name"] for c in schema if "name" in c["name"].lower()), None)

    return df, schema, id_col, name_col
