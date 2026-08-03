const pets = [
  {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    status: "Available",
  },
  {
    id: 2,
    name: "Lucy",
    breed: "Labrador",
    status: "Adopted",
  },
  {
    id: 3,
    name: "Rocky",
    breed: "German Shepherd",
    status: "Available",
  },
];

const LatestPets = () => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        Latest Pets
      </h2>

      {pets.map((pet) => (
        <div
          key={pet.id}
          style={{
            borderBottom: "1px solid #E5E7EB",
            padding: "15px 0",
          }}
        >
          <h4 style={{ margin: 0 }}>
            {pet.name}
          </h4>

          <p
            style={{
              margin: "6px 0",
              color: "#6B7280",
            }}
          >
            {pet.breed}
          </p>

          <small
            style={{
              color: "#2563EB",
            }}
          >
            {pet.status}
          </small>
        </div>
      ))}
    </div>
  );
};

export default LatestPets;