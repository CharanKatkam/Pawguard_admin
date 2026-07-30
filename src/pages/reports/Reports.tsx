import PageHeader from "../../components/common/PageHeader";
import ReportCards from "../../components/reports/ReportCards";

const Reports = () => {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="View analytics and reports."
      />

      <ReportCards />
    </>
  );
};

export default Reports;