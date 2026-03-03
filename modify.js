const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/admin/reviews/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Checkbox import
content = content.replace(
  'import { Badge } from "@/components/ui/badge";',
  'import { Badge } from "@/components/ui/badge";\nimport { Checkbox } from "@/components/ui/checkbox";'
);

// 2. Add state
content = content.replace(
  '  const [filter, setFilter] = useState("PENDING");\n  const [page, setPage] = useState(1);',
  '  const [filter, setFilter] = useState("PENDING");\n  const [page, setPage] = useState(1);\n\n  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());\n  const [isBulkRejectDialogOpen, setIsBulkRejectDialogOpen] = useState(false);\n  const [bulkRejectReason, setBulkRejectReason] = useState("");'
);

// 3. Add mutation and selection logic
const mutationLogic = `
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: "APPROVE" | "REJECT"; reason?: string }) => {
      const res = await fetch("/api/submissions/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "일괄 처리에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const { approved, rejected, failed } = data.data;
      const successCount = approved + rejected;
      if (successCount > 0) {
        toast.success(\`\${successCount}건 처리되었습니다.\`);
      }
      if (failed.length > 0) {
        toast.error(\`\${failed.length}건 처리 실패\`);
      }
      setSelectedIds(new Set());
      setIsBulkRejectDialogOpen(false);
      setBulkRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "일괄 처리에 실패했습니다.");
    },
  });

  const rows = data?.data ?? [];

  const selectableRows = rows.filter(r => ["PENDING", "IN_REVIEW", "REVISED"].includes(r.status));
  const isAllSelected = selectableRows.length > 0 && selectableRows.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(selectedIds);
      selectableRows.forEach(r => newSet.add(r.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
`;
content = content.replace('  const rows = data?.data ?? [];', mutationLogic);

// 4. Clear selection on filter change
content = content.replace(
  '                  setFilter(tab.key);\n                  setPage(1);',
  '                  setFilter(tab.key);\n                  setPage(1);\n                  setSelectedIds(new Set());'
);

// 5. Add action bar
const actionBar = `
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border mb-4 transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium">{selectedIds.size}건 선택됨</span>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => bulkActionMutation.mutate({ action: "APPROVE" })}
            disabled={bulkActionMutation.isPending}
          >
            일괄 승인
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsBulkRejectDialogOpen(true)}
            disabled={bulkActionMutation.isPending}
          >
            일괄 반려
          </Button>
        </div>
      )}

      {isLoading ? (`;
content = content.replace('      {isLoading ? (', actionBar);

// 6. Add Checkbox to TableHeader
content = content.replace(
  '                  <TableHead>프로젝트</TableHead>',
  '                  <TableHead className="w-12">\n                    <Checkbox\n                      checked={isAllSelected}\n                      onCheckedChange={toggleSelectAll}\n                      disabled={selectableRows.length === 0}\n                    />\n                  </TableHead>\n                  <TableHead>프로젝트</TableHead>'
);

// 7. Add Checkbox to TableRow
content = content.replace(
  '                      <TableRow key={row.id}>\n                        <TableCell className="max-w-[200px] font-medium">',
  '                      <TableRow key={row.id}>\n                        <TableCell>\n                          {["PENDING", "IN_REVIEW", "REVISED"].includes(row.status) ? (\n                            <Checkbox\n                              checked={selectedIds.has(row.id)}\n                              onCheckedChange={() => toggleSelect(row.id)}\n                            />\n                          ) : (\n                            <Checkbox disabled />\n                          )}\n                        </TableCell>\n                        <TableCell className="max-w-[200px] font-medium">'
);

// 8. Fix colSpan
content = content.replace('colSpan={7}', 'colSpan={8}');

// 9. Clear selection on pagination
content = content.replace(
  '              onClick={() => setPage(p => Math.max(1, p - 1))}',
  '              onClick={() => {\n                setPage(p => Math.max(1, p - 1));\n                setSelectedIds(new Set());\n              }}'
);
content = content.replace(
  '                  onClick={() => setPage(pageNum)}',
  '                  onClick={() => {\n                    setPage(pageNum);\n                    setSelectedIds(new Set());\n                  }}'
);
content = content.replace(
  '              onClick={() => setPage(p => p + 1)}',
  '              onClick={() => {\n                setPage(p => p + 1);\n                setSelectedIds(new Set());\n              }}'
);

// 10. Add Dialog
const dialog = `
      {/* 일괄 반려 다이얼로그 */}
      <Dialog open={isBulkRejectDialogOpen} onOpenChange={setIsBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일괄 반려</DialogTitle>
            <DialogDescription>
              선택한 {selectedIds.size}건의 제출물을 반려하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="bulk-reject-reason" className="text-sm font-medium">반려 사유 (선택)</label>
              <textarea
                id="bulk-reject-reason"
                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="일괄 반려 사유를 입력하세요..."
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBulkRejectDialogOpen(false)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => bulkActionMutation.mutate({ action: "REJECT", reason: bulkRejectReason })}
              disabled={bulkActionMutation.isPending}
            >
              {bulkActionMutation.isPending ? "처리 중..." : "반려 확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;
content = content.replace('    </div>\n  );\n}\n', dialog);

fs.writeFileSync(filePath, content);
console.log('Done');
