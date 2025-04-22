import { useState, useEffect } from "react";

export default function FilesTab({ orderId }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    // Placeholder fetch
    setFiles([
      { name: "design-spec.pdf", url: "#" },
      { name: "invoice-2304.pdf", url: "#" },
    ]);
  }, [orderId]);

  const handleUpload = () => {
    alert("TODO: Open file picker and upload logic");
  };

  const handleDelete = (fileName) => {
    alert(`TODO: Delete file: ${fileName}`);
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
            <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
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
