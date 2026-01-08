import SEO from '@components/common/SEO';
import styles from './Projects.module.css';

const Projects = () => {
  const projects = [
    {
      id: 1,
      title: 'Industrial Complex Power Distribution',
      category: 'Industrial',
      location: 'Dhaka, Bangladesh',
      year: '2024',
      description: 'Complete electrical infrastructure for a 50,000 sq ft industrial facility including main distribution panels, transformers, and backup power systems.',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80'
    },
    {
      id: 2,
      title: 'Commercial Building Electrical System',
      category: 'Commercial',
      location: 'Chittagong, Bangladesh',
      year: '2024',
      description: 'Full electrical installation for 12-story office building including lighting systems, power distribution, and emergency backup.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
    },
    {
      id: 3,
      title: 'Warehouse Automation Project',
      category: 'Industrial',
      location: 'Gazipur, Bangladesh',
      year: '2023',
      description: 'Smart warehouse electrical system with automated controls, industrial lighting, and power management for material handling equipment.',
      image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80'
    },
    {
      id: 4,
      title: 'Hotel Chain Electrical Upgrade',
      category: 'Hospitality',
      location: 'Sylhet, Bangladesh',
      year: '2023',
      description: 'Complete electrical system modernization including energy-efficient lighting, power distribution, and smart room controls.',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    },
    {
      id: 5,
      title: 'Factory Power Infrastructure',
      category: 'Manufacturing',
      location: 'Narayanganj, Bangladesh',
      year: '2023',
      description: 'Heavy-duty electrical infrastructure for textile manufacturing facility including transformers, control panels, and machinery wiring.',
      image: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80'
    },
    {
      id: 6,
      title: 'Shopping Mall Electrical Installation',
      category: 'Retail',
      location: 'Dhaka, Bangladesh',
      year: '2022',
      description: 'Multi-level shopping complex electrical system with decorative lighting, power distribution, and emergency systems.',
      image: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80'
    }
  ];

  const categories = ['All', 'Industrial', 'Commercial', 'Manufacturing', 'Hospitality', 'Retail'];

  return (
    <>
      <SEO 
        title="Projects | Electrical Supplier"
        description="View our portfolio of completed electrical installation projects across industrial, commercial, and residential sectors."
        keywords="electrical projects, industrial installations, commercial electrical work, project portfolio"
      />
      
      <div className={styles.projectsPage}>
        {/* Page Header */}
        <section className={styles.pageHeader}>
          <div className={styles.container}>
            <h1 className={styles.pageTitle}>Our Projects</h1>
            <p className={styles.pageDescription}>
              Trusted by leading businesses across Bangladesh. Our portfolio showcases successful electrical installations 
              in industrial facilities, commercial buildings, and infrastructure projects.
            </p>
          </div>
        </section>

        {/* Filter Section */}
        <section className={styles.filterSection}>
          <div className={styles.container}>
            <div className={styles.filterButtons}>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`${styles.filterBtn} ${category === 'All' ? styles.active : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Projects Grid */}
        <section className={styles.projectsSection}>
          <div className={styles.container}>
            <div className={styles.projectsGrid}>
              {projects.map((project) => (
                <article key={project.id} className={styles.projectCard}>
                  <div className={styles.projectImage}>
                    <img src={project.image} alt={project.title} />
                    <span className={styles.projectCategory}>{project.category}</span>
                  </div>
                  <div className={styles.projectContent}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    <div className={styles.projectMeta}>
                      <span className={styles.projectLocation}>📍 {project.location}</span>
                      <span className={styles.projectYear}>📅 {project.year}</span>
                    </div>
                    <p className={styles.projectDescription}>{project.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Ready to Start Your Project?</h2>
              <p className={styles.ctaDescription}>
                Contact us today to discuss your electrical requirements and receive a detailed quote.
              </p>
              <div className={styles.ctaButtons}>
                <a href="/quote" className={styles.ctaButtonPrimary}>Request a Quote</a>
                <a href="/contact" className={styles.ctaButtonSecondary}>Contact Us</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Projects;
