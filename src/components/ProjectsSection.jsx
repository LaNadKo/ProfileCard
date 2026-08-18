import React from 'react';
import { ExternalLink, Lock, AlertCircle, Wrench } from 'lucide-react';
import { GithubIcon } from './Icons';
import { useI18n } from '../i18n/translations';

export const ProjectsSection = ({ projects, lang }) => {
  const { t } = useI18n(lang);

  const getStatusBadge = (type, text) => {
    switch (type) {
      case 'private':
        return (
          <span className="project-status-badge status-private">
            <Lock size={11} />
            <span>{text || t.projects.privateBadge}</span>
          </span>
        );
      case 'dev':
      case 'wip':
        return (
          <span className="project-status-badge status-wip">
            <Wrench size={11} />
            <span>{text || t.projects.devBadge}</span>
          </span>
        );
      case 'experiment':
        return (
          <span className="project-status-badge status-experiment">
            <AlertCircle size={11} />
            <span>{text}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tab-content">
      <div className="projects-list">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <div className="project-title-group">
                <h3 className="project-title">{project.title}</h3>
                {project.statusBadge && getStatusBadge(project.statusType, project.statusBadge)}
              </div>

              <div className="project-links">
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link-btn"
                    title={t.projects.githubTitle}
                  >
                    <GithubIcon size={16} />
                  </a>
                )}
                {project.demo && (
                  <a
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link-btn"
                    title={t.projects.demoTitle}
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>

            <p className="project-desc">{project.description}</p>

            <div className="project-tags">
              {project.tags.map((tag, tIdx) => (
                <span key={tIdx} className="project-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
