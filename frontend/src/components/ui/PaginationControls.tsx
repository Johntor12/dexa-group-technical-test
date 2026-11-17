import { Button } from './Button';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
};

/** Shows only navigation actions that are valid for the current page. */
export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  loading = false,
  className = 'flex gap-2',
}: PaginationControlsProps) {
  const lastPage = Math.max(1, totalPages);

  if (lastPage <= 1) return null;

  return (
    <nav aria-label="Navigasi halaman tabel" className={className}>
      {page > 1 && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Sebelumnya
        </Button>
      )}
      {page < lastPage && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={loading}
          onClick={() => onPageChange(Math.min(lastPage, page + 1))}
        >
          Berikutnya
        </Button>
      )}
    </nav>
  );
}
