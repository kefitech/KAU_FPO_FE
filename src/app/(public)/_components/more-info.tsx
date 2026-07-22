import Image from "next/image";

const MoreInformation = () => {
  return (
    <section className="bg-dark text-light py-5">
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-12 text-center">
            <h2 className="mb-4">KAU Agri Info Portal:</h2>

            <a href="https://celkau.in/index.php" target="_blank" rel="noopener noreferrer">
              <Image
                src="/assets/img/moreInfo/KAU_Agri_info_Portal1.png" // replace with your image
                alt="KAU Agri Info Portal"
                width={1600}
                height={900}
                className="img-fluid rounded shadow"
                style={{
                  width: "100%",
                  maxWidth: "1600px",
                  height: "auto",
                }}
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MoreInformation;
