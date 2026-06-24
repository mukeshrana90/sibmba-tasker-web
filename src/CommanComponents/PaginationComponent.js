import SimbaPager from "./SimbaPager";

export default function PaginationComponent({
  page,
  setPage,
  totalPages,
  onPageChange,
}) {
  return (
    <SimbaPager
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange || setPage}
    />
  );
}
