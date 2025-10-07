import { MODELS } from "@/data/models";
import ModelCard from "@/components/ModelCard";

export default function ModelGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {MODELS.map((m) => (
        <ModelCard key={m.id} m={m} />
      ))}
    </div>
  );
}
