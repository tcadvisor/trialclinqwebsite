import React from "react";
import SiteHeader from "../../components/SiteHeader";

export type EhrItem = {
  id: string;
  vendor: string;
  organization: string;
  portals: number;
};

const ALL_EHRS: EhrItem[] = [
  { id: "1", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "2", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "3", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2 },
  { id: "4", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "5", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "6", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "7", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2 },
  { id: "8", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "9", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "10", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "11", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2 },
  { id: "12", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "13", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "14", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "15", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2 },
  { id: "16", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "17", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "18", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "19", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2 },
  { id: "20", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
  { id: "21", vendor: "MEDITECH Expanse", organization: "Citizens Medical Center", portals: 1 },
  { id: "22", vendor: "athenahealth", organization: "Texas Endovascular Associates", portals: 1 },
  { id: "23", vendor: "Epic", organization: "MD Anderson Cancer Center", portals: 2 },
  { id: "24", vendor: "Oracle", organization: "Mount Sinai Health System", portals: 1 },
];

function Card({ item }: { item: EhrItem }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 grid place-items-center rounded bg-gray-100 text-gray-700 text-xs font-semibold">
          {item.vendor.split(" ")[0]}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-500">{item.vendor}</div>
          <div className="font-medium leading-5">{item.organization}</div>
          <button className="mt-2 inline-flex items-center text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1">{item.portals} portal{item.portals>1?"s":""}</button>
        </div>
        <button aria-label="Add" className="ml-auto h-7 w-7 grid place-items-center rounded border text-gray-700">+</button>
      </div>
    </div>
  );
}

export default function EhrDirectory(): JSX.Element {
  const [q, setQ] = React.useState("");
  const [visible, setVisible] = React.useState(12);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ALL_EHRS;
    return ALL_EHRS.filter((i) =>
      i.vendor.toLowerCase().includes(t) || i.organization.toLowerCase().includes(t)
    );
  }, [q]);

  const items = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold">Available EMR/EHRs</h1>
        <p className="text-sm text-gray-600 mt-1">Securely connect your health record to help TrialCliniq match you with the most relevant clinical trials</p>

        <div className="mt-4">
          <div className="relative max-w-xl">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search healthcare systems or providers"
              className="w-full rounded-full border px-4 py-2 pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((i) => (
            <Card key={i.id+"-"+visible} item={i} />
          ))}
        </div>

        <div className="mt-6">
          {canLoadMore ? (
            <div className="max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setVisible((v) => Math.min(v + 9, filtered.length))}
                className="w-full rounded-full border px-4 py-2 hover:bg-gray-50"
              >
                Load more
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">No more results</div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-end text-xs text-gray-500">
          <span>Powered by Health Gorilla</span>
        </div>
      </main>
    </div>
  );
}
