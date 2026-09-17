import React from 'react';

const Table = ({ headers = [], children, emptyMessage = 'No hay datos disponibles' }) => {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300 bg-white">
        <thead className="bg-gray-50">
          <tr>
            {safeHeaders.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {React.Children.count(children) > 0 ? (
            children
          ) : (
            <tr>
              <td colSpan={safeHeaders.length || 1} className="px-3 py-8 text-sm text-gray-500 text-center">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
