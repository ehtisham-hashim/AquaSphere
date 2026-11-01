/**
 * Centralized Certificate & Compliance Data for AquaSphere
 * Verified Government Accreditations, Trade Marks, PSQCA Licensing & Lab Tests
 */

export const CERTIFICATE_SECTIONS = [
  {
    id: 'quality-standards',
    categoryName: 'Quality, Standards & Production Licenses',
    subtitle: 'National quality standard mark, commercial water bottling approval, and official trademark registrations.',
    certificates: [
      {
        id: 'psqca-license',
        title: 'Pakistan Standard Mark License',
        authority: 'Pakistan Standards & Quality Control Authority (PSQCA)',
        number: 'Licence No. CM/L-N-303/2025',
        validity: 'Valid through Dec 2026',
        badge: 'PSQCA Certified',
        image: '/images/certificates/cert-6.jpg',
        pdfUrl: '/pdfs/certificates/certificate-6.pdf',
        description: 'Official certification for Bottled Drinking Water under National Pakistan Standard PS:4633.'
      },
      {
        id: 'plant-license',
        title: 'Commercial Operation & Plant License',
        authority: 'Cantonment Board / Health & Sanitation Authority',
        number: 'Commercial Bottling & Plant Clearance',
        validity: 'Active & Verified',
        badge: 'Plant Verified',
        image: '/images/certificates/cert-2.jpg',
        pdfUrl: '/pdfs/certificates/certificate-2.pdf',
        description: 'Authorized municipal commercial water purification and hygienic bottling operations.'
      },
      {
        id: 'trademark-registration',
        title: 'Trademark & Brand Registration',
        authority: 'Intellectual Property Organisation (IPO Pakistan)',
        number: 'Trade Mark App No. 804987 (Class 32)',
        validity: 'Registered Class 32',
        badge: 'IPO Pakistan',
        image: '/images/certificates/cert-1.jpg',
        pdfUrl: '/pdfs/certificates/certificate-1.pdf',
        description: 'Official registered trademark for AquaSphere pure drinking water in 500ml, 1500ml, and 19L packaging.'
      }
    ]
  },
  {
    id: 'corporate-legal',
    categoryName: 'Corporate Registrations & Legal Accreditations',
    subtitle: 'Official corporate incorporation, federal taxation credentials, and statutory employee welfare compliance.',
    certificates: [
      {
        id: 'secp-incorporation',
        title: 'Certificate of Incorporation',
        authority: 'Securities & Exchange Commission of Pakistan (SECP)',
        number: 'Corporate ID: 0262135',
        validity: 'Incorporated Entity',
        badge: 'SECP Registered',
        image: '/images/certificates/cert-4.jpg',
        pdfUrl: '/pdfs/certificates/certificate-4.pdf',
        description: 'Aqua Sphere (SMC-Private) Limited incorporated under the Companies Act 2017.'
      },
      {
        id: 'fbr-taxpayer',
        title: 'Federal Taxpayer Registration (NTN)',
        authority: 'Federal Board of Revenue (FBR)',
        number: 'Reg No. E208742 · Ref 208742-5',
        validity: 'Active Taxpayer List (ATL)',
        badge: 'FBR Verified',
        image: '/images/certificates/cert-5.jpg',
        pdfUrl: '/pdfs/certificates/certificate-5.pdf',
        description: 'Verified Active Corporate Taxpayer status for Aqua Sphere (SMC-Private) Limited.'
      },
      {
        id: 'labour-registration',
        title: 'Labour & Industrial Compliance Registration',
        authority: 'Directorate of Labour Welfare, Govt. of Punjab',
        number: 'Labour Dept Registration',
        validity: 'Statutory Compliance',
        badge: 'Govt. Accredited',
        image: '/images/certificates/cert-3.jpg',
        pdfUrl: '/pdfs/certificates/certificate-3.pdf',
        description: 'Certified industrial labor standards and worker welfare compliance.'
      }
    ]
  }
];

export const ALL_CERTIFICATES = CERTIFICATE_SECTIONS.flatMap(s => s.certificates);

export const REPORTS_DATA = [
  {
    id: 'lab-report',
    title: 'Water Quality & Laboratory Test Report',
    authority: 'Certified Environmental & Microbiological Analysis Laboratory',
    number: 'Full Chemical & Bacterial Panel',
    validity: 'PSQCA Compliant Purity',
    badge: 'Lab Tested',
    image: '/images/certificates/lab-report.jpg',
    pdfUrl: '/pdfs/reports/lab-report.pdf',
    description: 'Comprehensive chemical, physical, and microbiological laboratory testing verifying optimal mineral balance and zero pathogens.'
  }
];
