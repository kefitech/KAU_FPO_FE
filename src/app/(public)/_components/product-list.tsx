import Link from "next/link";
import { productData } from "../_data/products";

const ProductList = () => {
  return (
    <div className="product-list-area default-padding-bottom bottom-less bg-dark text-center text-light">
      <div className="shape-bottom-right">
        <img src="/assets/img/shape/21.png" alt="shape" />
      </div>
      <div className="container">
        <div className="row">
          <div className="col-xl-10 offset-xl-1 mb-50 mb-xs-30">
            <h2 className="mask-text" style={{ backgroundImage: "url(/assets/img/banner/3.jpg)" }}>
              Healthy life with fresh products
            </h2>
          </div>
          <div className="product-list-box">
            {productData.map((product) => (
              <div key={product.id} className="product-list-item">
                <Link href={`/service-details/${product.id}`}>
                  <img src={`/assets/img/icon/${product.thumb}`} alt={product.title} />
                  <h5>{product.title}</h5>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
