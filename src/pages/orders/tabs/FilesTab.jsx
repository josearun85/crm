import { useState, useEffect } from "react";
import {
  fetchOrderFiles,
  uploadOrderFile,
  deleteOrderFile,
} from "../services/orderDetailsService";

export default function FilesTab({ orderId }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    refreshFiles();
  }, [orderId]);

  const refreshFiles = async () => {
    try {
      const list = await fetchOrderFiles(orderId);
      setFiles(list);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  const handleUpload = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;

      try {
        await uploadOrderFile(orderId, { name: file.name, url: URL.createObjectURL(file) });
        refreshFiles();
      } catch (err) {
        console.error("Upload failed", err);
      }
    };
    fileInput.click();
  };

  const handleDelete = async (fileName) => {
    try {
      await deleteOrderFile(orderId, fileName);
      refreshFiles();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Files for Order {orderId}</h2>
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
      >
        + Upload File
      </button>

      <ul className="text-sm divide-y border rounded">
        {files.map((file, index) => (
          <li key={index} className="flex items-center justify-between p-2">
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              {file.name}
            </a>
            <button
              onClick={() => handleDelete(file.name)}
              className="text-red-600 text-xs hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
