export interface DepartmentInfo {
  code: string;
  name: string;
  category: 'Computing & Software' | 'Electrical & Electronics' | 'Mechanical & Automation' | 'Civil & Infrastructure' | 'Bio & Chemical' | 'Allied & Postgraduate';
}

export const CAMPUS_DEPARTMENTS: DepartmentInfo[] = [
  // Computing & Software
  { code: 'CSE', name: 'Computer Science & Engineering', category: 'Computing & Software' },
  { code: 'IT', name: 'Information Technology', category: 'Computing & Software' },
  { code: 'AIML', name: 'Artificial Intelligence & Machine Learning', category: 'Computing & Software' },
  { code: 'AIDS', name: 'AI & Data Science', category: 'Computing & Software' },
  { code: 'Cyber Security', name: 'Cyber Security & Forensics', category: 'Computing & Software' },
  { code: 'CS-BS', name: 'Computer Science & Business Systems', category: 'Computing & Software' },
  { code: 'IoT', name: 'Internet of Things & Blockchain', category: 'Computing & Software' },

  // Electrical & Electronics
  { code: 'ECE', name: 'Electronics & Communication Engineering', category: 'Electrical & Electronics' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering', category: 'Electrical & Electronics' },
  { code: 'EE', name: 'Electrical Engineering', category: 'Electrical & Electronics' },
  { code: 'VLSI', name: 'VLSI Design & Embedded Systems', category: 'Electrical & Electronics' },

  // Mechanical & Automation
  { code: 'ME', name: 'Mechanical Engineering', category: 'Mechanical & Automation' },
  { code: 'Robotics', name: 'Robotics & Automation', category: 'Mechanical & Automation' },
  { code: 'Mechatronics', name: 'Mechatronics Engineering', category: 'Mechanical & Automation' },
  { code: 'Automobile', name: 'Automobile Engineering', category: 'Mechanical & Automation' },
  { code: 'Aerospace', name: 'Aerospace / Aeronautical Engineering', category: 'Mechanical & Automation' },

  // Civil & Infrastructure
  { code: 'Civil', name: 'Civil Engineering', category: 'Civil & Infrastructure' },
  { code: 'Environmental', name: 'Environmental Engineering', category: 'Civil & Infrastructure' },

  // Bio & Chemical
  { code: 'Biotech', name: 'Biotechnology', category: 'Bio & Chemical' },
  { code: 'Chemical', name: 'Chemical Engineering', category: 'Bio & Chemical' },
  { code: 'Biomedical', name: 'Biomedical Engineering', category: 'Bio & Chemical' },

  // Allied & Postgraduate
  { code: 'MCA', name: 'Master of Computer Applications', category: 'Allied & Postgraduate' },
  { code: 'BCA', name: 'Bachelor of Computer Applications', category: 'Allied & Postgraduate' },
  { code: 'MBA', name: 'Management Studies (MBA)', category: 'Allied & Postgraduate' },
  { code: 'Pharmacy', name: 'Pharmaceutical Sciences', category: 'Allied & Postgraduate' },
];

export const DEPARTMENT_CODES: string[] = CAMPUS_DEPARTMENTS.map((dept) => dept.code);

export const STUDY_YEARS: number[] = [1, 2, 3, 4, 5];
