import React from "react";
import { Link } from "react-router-dom";
import HomeHeader from "../../components/HomeHeader";

export default function MulticenterListings(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HomeHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Multicenter Listings</h1>
        <p className="text-gray-600 mb-6">View and manage your active multicenter trial sites.</p>
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Example study</div>
          <div className="mt-2 text-xl font-semibold">Phase II Chronic Pain Study</div>
          <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border p-4">
              <div className="text-gray-500">Active Sites</div>
              <div className="text-2xl font-semibold">6</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-gray-500">Enrolled</div>
              <div className="text-2xl font-semibold">42</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-gray-500">Screen Fail</div>
              <div className="text-2xl font-semibold">18%</div>
            </div>
          </div>
          <button className="mt-6 rounded-full bg-gray-900 text-white px-4 py-2 hover:bg-black">Add Site</button>
        </div>
      </main>
    </div>
  );
}
