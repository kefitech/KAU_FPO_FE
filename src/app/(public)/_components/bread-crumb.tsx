import Link from "next/link";

interface Props {
  title: string;
  breadCrumb: string;
}

const BreadCrumb = ({ title, breadCrumb }: Props) => {
  return (
    <div
      className="breadcrumb-area text-center shadow dark bg-fixed text-light"
      style={{ backgroundImage: "url(/assets/img/banner/5.jpg)" }}
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <h1>{title}</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li>
                  <Link href="/"><i className="fas fa-home" /> Home</Link>
                </li>
                <li className="active">{breadCrumb}</li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreadCrumb;
