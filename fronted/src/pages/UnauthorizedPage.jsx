import React from "react";
import { Link } from "react-router-dom";

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          Unauthorized Access
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          You do not have permission to view this page with your current role.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
