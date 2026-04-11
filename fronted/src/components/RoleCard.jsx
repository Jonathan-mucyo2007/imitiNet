import React from "react";
import { useNavigate } from "react-router-dom";

function RoleCard({ title, description, icon: Icon, buttonLabel, imageSrc }) {
  const navigate = useNavigate();

  const handleAccessPortal = () => {
    navigate(`/login/${encodeURIComponent(title)}`);
  };

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl bg-slate-100">
        <img
          src={imageSrc}
          alt={`${title} preview`}
          className="aspect-video w-full object-cover"
        />
      </div>

      <p className="mb-6 text-sm leading-7 text-slate-500">{description}</p>

      <button
        type="button"
        onClick={handleAccessPortal}
        className="mt-auto w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700"
      >
        {buttonLabel}
      </button>
    </article>
  );
}

export default RoleCard;
