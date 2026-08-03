import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import {
  FaPaw,
  FaAmbulance,
  FaHeart,
  FaPlus,
} from "react-icons/fa";
import dogService from "../../services/dogService";

const Pets = () => {
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDogs();
  }, []);

  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dogService.getDogs();
      console.log("Dogs:", response);

      const dogList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formattedDogs = dogList.map((dog: any) => ({
        ...dog,
        registration_number: dog.registration_number || dog.id || "-",
        name: dog.name || "-",
        breed: dog.breed || "-",
        estimated_age: dog.estimated_age || dog.age || "-",
        status: dog.status || "active",
      }));

      setDogs(formattedDogs);
    } catch (err: any) {
      console.error("Error fetching dogs:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load dogs list. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: "Total Registered Dogs",
      value: loading ? "..." : dogs.length,
      trend: "Registered Dogs",
      color: "#2563EB",
      icon: <FaPaw />,
    },
    {
      title: "Dogs in Shelter",
      value: loading
        ? "..."
        : dogs.filter((dog) => String(dog.status).toLowerCase().includes("shelter")).length,
      trend: "Currently Sheltered",
      color: "#EF4444",
      icon: <FaAmbulance />,
    },
    {
      title: "Adoptable Dogs",
      value: loading
        ? "..."
        : dogs.filter((dog) => dog.is_adoptable || String(dog.status).toLowerCase().includes("adopt")).length,
      trend: "Ready for Adoption",
      color: "#10B981",
      icon: <FaHeart />,
    },
  ];

  const columns = [
    {
      key: "registration_number",
      title: "Dog ID",
    },
    {
      key: "name",
      title: "Dog Name",
    },
    {
      key: "breed",
      title: "Breed",
    },
    {
      key: "estimated_age",
      title: "Age",
    },
    {
      key: "status",
      title: "Status",
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: "24px",
          background:
            "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
          }}
        >
          Animal & Rescue Case Directory
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94A3B8",
            fontSize: "14px",
          }}
        >
          Comprehensive dog tracking, intake records,
          shelter management and adoption monitoring.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <QuickActionCard
          icon={<FaPlus />}
          title="Register New Dog"
          subtitle="Register rescued dog"
          color="#2563EB"
          onClick={() => alert("Register Dog")}
        />

        <QuickActionCard
          icon={<FaAmbulance />}
          title="Update Status"
          subtitle="Update dog status"
          color="#EF4444"
          onClick={() => alert("Update Status")}
        />

        <QuickActionCard
          icon={<FaHeart />}
          title="Ready For Adoption"
          subtitle="Mark adoptable"
          color="#10B981"
          onClick={() => alert("Ready For Adoption")}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {stats.map((item) => (
          <StatCard
            key={item.title}
            {...item}
          />
        ))}
      </div>

      <div
        className="soft-card"
        style={{
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Registered Dogs
          </h3>

          {loading && (
            <span
              style={{
                fontSize: "13px",
                color: "#2563EB",
                fontWeight: 600,
              }}
            >
              Loading dogs...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={dogs}
          onView={(row) =>
            alert(`Dog: ${row.name}`)
          }
          onEdit={(row) =>
            alert(`Edit Dog: ${row.name}`)
          }
        />
      </div>
    </div>
  );
};

export default Pets;