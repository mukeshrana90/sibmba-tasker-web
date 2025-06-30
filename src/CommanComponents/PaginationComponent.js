// import React from "react";
// import Pagination from "react-bootstrap/Pagination";

// export default function PaginationComponent({ page, setPage, totalPages }) {
//   const getPaginationItems = () => {
//     const items = [];
//     const maxVisiblePages = 5;
//     const half = Math.floor(maxVisiblePages / 2);
//     const start = Math.max(0, Math.min(page - half, totalPages - maxVisiblePages));
//     const end = Math.min(totalPages, start + maxVisiblePages);

//     if (start > 0) {
//       items.push(<Pagination.Item key={0} onClick={() => setPage(0)}>{1}</Pagination.Item>);
//       if (start > 1) {
//         items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
//       }
//     }

//     for (let i = start; i < end; i++) {
//       items.push(
//         <Pagination.Item
//           key={i}
//           active={i === page}
//           onClick={() => setPage(i)}
//         >
//           {i + 1}
//         </Pagination.Item>
//       );
//     }

//     if (end < totalPages) {
//       if (end < totalPages - 1) {
//         items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
//       }
//       items.push(
//         <Pagination.Item key={totalPages - 1} onClick={() => setPage(totalPages - 1)}>
//           {totalPages}
//         </Pagination.Item>
//       );
//     }

//     return items;
//   };

//   return (
//     <div className="pagination-block">
//       <Pagination className="green-pagination">
//         <Pagination.First onClick={() => setPage(0)} disabled={page === 0} />
//         <Pagination.Prev onClick={() => setPage(page - 1)} disabled={page === 0} />
//         {getPaginationItems()}
//         <Pagination.Next onClick={() => setPage(page + 1)} disabled={page === totalPages - 1} />
//         <Pagination.Last onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} />
//         </Pagination>
//     </div>
//   );
// }

import React from "react";
import Pagination from "react-bootstrap/Pagination";

export default function PaginationComponent({ page, setPage, totalPages }) {
  const getPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const half = Math.floor(maxVisiblePages / 2);
    const start = Math.max(
      1,
      Math.min(page - half, totalPages - maxVisiblePages + 1)
    );
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (start > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => setPage(1)}>
          {1}
        </Pagination.Item>
      );
      if (start > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
      }
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <Pagination.Item key={i} active={i === page} onClick={() => setPage(i)}>
          {i}
        </Pagination.Item>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
      }
      items.push(
        <Pagination.Item key={totalPages} onClick={() => setPage(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }

    return items;
  };

  return (
    <div className="pagination-block">
      <Pagination
        className="green-pagination d-flex flex-wrap justify-content-center"
        size="sm"
      >
        <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
        <Pagination.Prev
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        />
        {getPaginationItems()}
        <Pagination.Next
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        />
        <Pagination.Last
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
        />
      </Pagination>
    </div>
  );
}
