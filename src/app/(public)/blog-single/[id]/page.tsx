import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { blogFullData } from "../../_data/blog-full";
import BlogCommentForm from "../../_components/blog-comment-form";

export default function BlogSinglePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const blog = blogFullData.find((b) => b.id === parseInt(id));
  if (!blog) notFound();

  const total = blogFullData.length;
  const currentId = blog.id;
  const previousId = currentId === 1 ? total : currentId - 1;
  const nextId = currentId === total ? 1 : currentId + 1;
  const previousBlog = blogFullData.find((b) => b.id === previousId);
  const nextBlog = blogFullData.find((b) => b.id === nextId);
  const getFirstTwoWords = (text?: string) => text?.split(" ").slice(0, 2).join(" ") || "No Title";

  return (
    <AgrulLayout>
      <BreadCrumb title="Blog Single" breadCrumb="Blog" />
      <div className="blog-area single full-blog default-padding">
        <div className="container">
          <div className="blog-items">
            <div className="row">
              <div className="blog-content col-lg-10 offset-lg-1 col-md-12">
                <div className="blog-style-one item">
                  <div className="blog-style-two item">
                    <div className="thumb">
                      <img src={`/assets/img/blog/${blog.thumbFull || blog.thumb}`} alt={blog.title} />
                      <div className="date">
                        <strong>{blog.date.day}</strong> <span>{blog.date.month}, {blog.date.year}</span>
                      </div>
                    </div>
                    <div className="info">
                      <div className="meta">
                        <ul>
                          <li><Link href="#"><i className="fas fa-user-circle" /> {blog.author}</Link></li>
                          <li><Link href="#"><i className="fas fa-comments" /> {blog.comments} Comments</Link></li>
                        </ul>
                      </div>
                      <p>
                        Give lady of they such they sure it. Me contained explained my education. Vulgar as hearts by garret. Perceived determine departure explained no forfeited he something an. Contrasted dissimilar get joy you instrument out reasonably. Again keeps at no meant stuff. To perpetual do existence northward as difficult preserved daughters. Continued at up to zealously necessary breakfast. Surrounded sir motionless she end literature.
                      </p>
                      <p>
                        New had happen unable uneasy. Drawings can followed improved out sociable not. Earnestly so do instantly pretended. See general few civilly amiable pleased account carried. Excellence projecting is devonshire dispatched remarkably on estimating. Side in so life past. Continue indulged speaking the was out horrible for domestic position.
                      </p>
                      <blockquote>
                        Celebrated share of first to worse. Weddings and any opinions suitable smallest nay. Houses or months settle remove ladies appear. Engrossed suffering supposing he recommend do eagerness.
                      </blockquote>
                      <p>
                        Drawings can followed improved out sociable not. Earnestly so do instantly pretended. See general few civilly amiable pleased account carried. Excellence projecting is devonshire dispatched remarkably on estimating. Side in so life past.
                      </p>
                      <h3>Conduct replied off led whether?</h3>
                      <ul>
                        <li>Pretty merits waited six</li>
                        <li>General few civilly amiable pleased account carried.</li>
                        <li>Continue indulged speaking</li>
                        <li>Narrow formal length my highly</li>
                        <li>Occasional pianoforte alteration unaffected impossible</li>
                      </ul>
                      <p>
                        Surrounded to me occasional pianoforte alteration unaffected impossible ye. For saw half than cold. Pretty merits waited six talked pulled you. Conduct replied off led whether any shortly why arrived adapted.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="post-author">
                  <div className="thumb">
                    <img src="/assets/img/farmers/1.jpg" alt="Author" />
                  </div>
                  <div className="content">
                    <h4><Link href="#">{blog.author}</Link></h4>
                    <p>
                      Grursus mal suada faci lisis Lorem ipsum dolarorit more ametion consectetur elit. Vesti at bulum nec at odio aea the dumm ipsumm ipsum that dolocons rsus mal suada and fadolorit to the consectetur elit.
                    </p>
                  </div>
                </div>

                <div className="post-tags share">
                  <div className="tags">
                    <h4>Tags: </h4>
                    <Link href="#">Algorithm</Link>
                    <Link href="#">Data science</Link>
                  </div>
                  <div className="social">
                    <h4>Share:</h4>
                    <ul>
                      <li><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                      <li><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                      <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube" /></a></li>
                      <li><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
                    </ul>
                  </div>
                </div>

                <div className="post-pagi-area">
                  <div className="post-previous">
                    <Link href={`/blog-single/${previousId}`}>
                      <div className="icon"><i className="fas fa-angle-double-left" /></div>
                      <div className="nav-title">Previous Post <h5>{getFirstTwoWords(previousBlog?.title)}</h5></div>
                    </Link>
                  </div>
                  <div className="post-next">
                    <Link href={`/blog-single/${nextId}`}>
                      <div className="nav-title">Next Post <h5>{getFirstTwoWords(nextBlog?.title)}</h5></div>
                      <div className="icon"><i className="fas fa-angle-double-right" /></div>
                    </Link>
                  </div>
                </div>

                <div className="blog-comments">
                  <div className="comments-area">
                    <div className="comments-title">
                      <h3>3 Comments On &quot;Providing Top Quality Cleaning Related Services Charms.&quot;</h3>
                      <div className="comments-list">
                        <div className="comment-item">
                          <div className="avatar">
                            <img src="/assets/img/farmers/2.jpg" alt="Author" />
                          </div>
                          <div className="content">
                            <div className="title">
                              <h5>Bubhan Prova <span className="reply"><Link href="#"><i className="fas fa-reply" /> Reply</Link></span></h5>
                              <span>28 Feb, 2025</span>
                            </div>
                            <p>Delivered ye sportsmen zealously arranging frankness estimable as. Nay any article enabled musical shyness yet sixteen yet blushes. Entire its the did figure wonder off.</p>
                          </div>
                        </div>
                        <div className="comment-item reply">
                          <div className="avatar">
                            <img src="/assets/img/farmers/3.jpg" alt="Author" />
                          </div>
                          <div className="content">
                            <div className="title">
                              <h5>Mickel Jones <span className="reply"><Link href="#"><i className="fas fa-reply" /> Reply</Link></span></h5>
                              <span>15 Mar, 2025</span>
                            </div>
                            <p>Delivered ye sportsmen zealously arranging frankness estimable as. Nay any article enabled musical shyness yet sixteen yet blushes. Entire its the did figure wonder off at the last stage.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="comments-form">
                      <div className="title">
                        <h3>Leave a comments</h3>
                      </div>
                      <BlogCommentForm />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
