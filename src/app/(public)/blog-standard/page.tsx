"use client";
import { useState } from "react";
import Link from "next/link";
import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import { blogFullData } from "../_data/blog-full";

const ITEMS_PER_PAGE = 6;

export default function BlogStandardPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(blogFullData.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentBlogs = blogFullData.slice(start, start + ITEMS_PER_PAGE);

  return (
    <AgrulLayout>
      <BreadCrumb title="Our Blog" breadCrumb="Blog" />
      <div className="blog-area blog-grid default-padding">
        <div className="container">
          <div className="blog-item-box">
            <div className="row">
              {currentBlogs.map((blog) => (
                <div className="col-xl-4 col-md-6 single-item" key={blog.id}>
                  <div className="blog-style-one">
                    <div className="thumb">
                      <Link href={`/blog-single/${blog.id}`}>
                        <img src={`/assets/img/blog/${blog.thumb}`} alt={blog.title} />
                      </Link>
                      <div className="date">
                        <strong>{blog.date.day}</strong>
                        <span>{blog.date.month}, {blog.date.year}</span>
                      </div>
                    </div>
                    <div className="info">
                      <div className="meta">
                        <ul>
                          <li><Link href="#">{blog.author}</Link></li>
                          <li><Link href="#">{blog.comments} Comments</Link></li>
                        </ul>
                      </div>
                      <h3 className="post-title">
                        <Link href={`/blog-single/${blog.id}`}>{blog.title}</Link>
                      </h3>
                      <Link href={`/blog-single/${blog.id}`} className="button-regular">
                        Continue Reading <i className="fas fa-arrow-right" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="col-md-12 pagi-area text-center">
              <nav>
                <ul className="pagination text-center" style={{ justifyContent: "center" }}>
                  <li className={`page-item${currentPage === 1 ? " disabled" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                      <i className="fas fa-angle-double-left" />
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <li key={page} className={`page-item${page === currentPage ? " active" : ""}`}>
                      <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                    </li>
                  ))}
                  <li className={`page-item${currentPage === totalPages ? " disabled" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                      <i className="fas fa-angle-double-right" />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
