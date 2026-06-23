const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  
  async getUploads() {
    const res = await fetch(`${API_URL}/api/uploads`);
    if (!res.ok) throw new Error("Failed to fetch uploads");
    return res.json();
  },
  
  async activateUpload(id: string) {
    const res = await fetch(`${API_URL}/api/uploads/${id}/activate`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to activate");
    return res.json();
  },

  async deleteUpload(id: string) {
    const res = await fetch(`${API_URL}/api/uploads/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete upload");
    return res.json();
  },
  
  async getAnalytics(uploadId: string) {
    const res = await fetch(`${API_URL}/api/analytics/${uploadId}`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },
  
  async nlQuery(uploadId: string, query: string) {
    const res = await fetch(`${API_URL}/api/analytics/${uploadId}/nl-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error("NL query failed");
    return res.json();
  },

  async getSchema(uploadId: string) {
    const res = await fetch(`${API_URL}/api/schema/${uploadId}`);
    if (!res.ok) throw new Error("Failed to fetch schema");
    return res.json() as Promise<{
      upload_id: string;
      filename: string;
      row_count: number;
      schema: { name: string; type: string }[];
    }>;
  },

  async customQuery(
    uploadId: string,
    payload: {
      chart_type: string;
      x_column: string;
      y_columns?: string[];
      aggregation: string;
      filters?: { column: string; operator: string; value: string }[];
      sort_by?: string;
      sort_dir?: string;
      limit?: number;
      title?: string;
    }
  ) {
    const res = await fetch(`${API_URL}/api/analytics/${uploadId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Custom query failed");
    return res.json();
  },
  
  async search(
    uploadId: string,
    options: {
      query?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortDir?: "asc" | "desc";
      filterField?: string;
      filterValue?: string;
      filters?: { column: string; operator: string; value: string }[];
    } = {}
  ) {
    const {
      query = "",
      page = 1,
      limit = 20,
      sortBy = "row_index",
      sortDir = "asc",
      filterField = "",
      filterValue = "",
      filters = [],
    } = options;

    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(limit),
      sort_by: sortBy,
      sort_dir: sortDir,
    });

    if (filterField && filterValue) {
      params.set("filter_field", filterField);
      params.set("filter_value", filterValue);
    }

    if (filters && filters.length > 0) {
      params.set("filters", JSON.stringify(filters));
    }

    const res = await fetch(`${API_URL}/api/search/${uploadId}?${params}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  },

  async getFacetValues(uploadId: string, field: string) {
    const res = await fetch(
      `${API_URL}/api/search/${uploadId}/facets/${encodeURIComponent(field)}`
    );
    if (!res.ok) throw new Error("Failed to load filter values");
    return res.json() as Promise<{ field: string; values: string[] }>;
  },
};