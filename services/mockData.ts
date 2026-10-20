
import { BudgetRecord, DropdownOptions, HierarchyData, ResponsibleAgencyData, CompareRecord, User, RegionData } from '../types';

export const INITIAL_DROPDOWN_DATA: DropdownOptions = {
    integration: [
        'ไม่เป็นหน่วยงานบูรณาการ',
        'หน่วยปฏิบัติ (ด้านอุทยานแห่งชาติ)',
        'หน่วยปฏิบัติ (ด้านสัตว์ป่า)'
    ],
    mainAgency: [
        'กรมการแพทย์', 'กรมอนามัย', 'กรมควบคุมโรค', 'กรมสุขภาพจิต',
        'กรมการแพทย์แผนไทยและการแพทย์ทางเลือก', 'กรมสนับสนุนบริการสุขภาพ',
        'กรมวิทยาศาสตร์การแพทย์', 'สำนักงานปลัดกระทรวงสาธารณสุข'
    ],
    responsibleAgency: [
        'สำนักงานสาธารณสุขจังหวัด', 'โรงพยาบาลศูนย์', 'โรงพยาบาลทั่วไป', 'โรงพยาบาลชุมชน'
    ],
    integrationArea: [
        'พื้นที่กรุงเทพฯ', 'พื้นที่ภาคเหนือ', 'พื้นที่ภาคอีสาน', 'พื้นที่ภาคใต้'
    ],
    province: [
        'กรุงเทพมหานคร', 'เชียงใหม่', 'เชียงราย', 'ขอนแก่น', 'อุบลราชธานี', 'สงขลา', 'ภูเก็ต'
    ],
    activity: [
        'การป้องกันและควบคุมโรคติดต่อ', 'การส่งเสริมสุขภาพ', 'การพัฒนาระบบบริการสุขภาพ',
        'การพัฒนาทรัพยากรบุคคล', 'การวิจัยและพัฒนา', 'การจัดการสิ่งแวดล้อม',
        'การดูแลผู้สูงอายุ', 'การดูแลสุขภาพแม่และเด็ก'
    ],
    unit: [
        'คน', 'ครั้ง', 'แห่ง', 'หลักสูตร', 'โครงการ', 'กิจกรรม', 'ชุด', 'เรื่อง'
    ]
};

export const INITIAL_HIERARCHY: HierarchyData[] = [
    { mainAgency: 'กรมการแพทย์', province: 'กรุงเทพมหานคร' },
    { mainAgency: 'กรมการแพทย์', province: 'เชียงใหม่' },
    { mainAgency: 'กรมอนามัย', province: 'ขอนแก่น' },
    { mainAgency: 'กรมอนามัย', province: 'อุบลราชธานี' },
    { mainAgency: 'กรมควบคุมโรค', province: 'เชียงราย' },
    { mainAgency: 'กรมควบคุมโรค', province: 'สงขลา' },
    { mainAgency: 'กรมสุขภาพจิต', province: 'ภูเก็ต' },
    { mainAgency: 'กรมสุขภาพจิต', province: 'กรุงเทพมหานคร' }
];

export const INITIAL_RESP_DATA: ResponsibleAgencyData[] = [
    { mainAgency: 'กรมการแพทย์', responsibleAgency: 'สำนักงานสาธารณสุขจังหวัด', integrationArea: 'พื้นที่กรุงเทพฯ' },
    { mainAgency: 'กรมการแพทย์', responsibleAgency: 'โรงพยาบาลศูนย์', integrationArea: 'พื้นที่กรุงเทพฯ' },
    { mainAgency: 'กรมอนามัย', responsibleAgency: 'สำนักงานสาธารณสุขจังหวัด', integrationArea: 'พื้นที่ภาคเหนือ' },
    { mainAgency: 'กรมอนามัย', responsibleAgency: 'โรงพยาบาลทั่วไป', integrationArea: 'พื้นที่ภาคเหนือ' },
    { mainAgency: 'กรมควบคุมโรค', responsibleAgency: 'โรงพยาบาลศูนย์', integrationArea: 'พื้นที่ภาคอีสาน' },
    { mainAgency: 'กรมควบคุมโรค', responsibleAgency: 'โรงพยาบาลทั่วไป', integrationArea: 'พื้นที่ภาคอีสาน' },
    { mainAgency: 'กรมสุขภาพจิต', responsibleAgency: 'โรงพยาบาลชุมชน', integrationArea: 'พื้นที่ภาคใต้' }
];

export const INITIAL_BUDGET_RECORDS: BudgetRecord[] = [
    {
        id: '1',
        integration: 'หน่วยปฏิบัติ (ด้านอุทยานแห่งชาติ)',
        mainAgency: 'กรมการแพทย์',
        province: 'กรุงเทพมหานคร',
        responsibleAgency: 'สำนักงานสาธารณสุขจังหวัด',
        integrationArea: 'พื้นที่กรุงเทพฯ',
        activity: 'การป้องกันและควบคุมโรคติดต่อ',
        target: '1000',
        unit: 'คน',
        salaryPermanent: 5000000,
        governmentCompensation: 2000000,
        compensationSupplies: 1500000,
        contractEmployees: 800000,
        utilities: 3000000,
        equipment: 1200000,
        landConstruction: 500000,
        subsidies: 300000,
        otherExpenses: 200000,
        timestamp: '2024-01-15 10:30:00'
    }
];

export const INITIAL_COMPARE_DATA: CompareRecord[] = [
    { id: '1', activity: 'การป้องกันและควบคุมโรคติดต่อ', referenceBudget: 12000000 },
    { id: '2', activity: 'การส่งเสริมสุขภาพ', referenceBudget: 8500000 },
    { id: '3', activity: 'การพัฒนาระบบบริการสุขภาพ', referenceBudget: 11000000 },
    { id: '4', activity: 'การพัฒนาทรัพยากรบุคคล', referenceBudget: 6000000 },
    { id: '5', activity: 'การวิจัยและพัฒนา', referenceBudget: 4500000 },
    { id: '6', activity: 'การจัดการสิ่งแวดล้อม', referenceBudget: 7500000 },
    { id: '7', activity: 'การดูแลผู้สูงอายุ', referenceBudget: 9200000 },
    { id: '8', activity: 'การดูแลสุขภาพแม่และเด็ก', referenceBudget: 6800000 }
];

export const INITIAL_USERS: User[] = [
    { username: 'admin', password: 'admin', name: 'ผู้ดูแลระบบสูงสุด', role: 'admin' },
    { username: 'staff', password: '1234', name: 'เจ้าหน้าที่', role: 'staff' },
    { username: 'viewer', password: '1234', name: 'ผู้เยี่ยมชม', role: 'viewer' }
];

export const INITIAL_REGION_DATA: RegionData[] = [
    { regionName: "ภาคกลางตอนบน", provinces: ["ชัยนาท", "พระนครศรีอยุธยา", "ลพบุรี", "สระบุรี", "สิงห์บุรี", "อ่างทอง"] },
    { regionName: "ภาคกลางปริมณฑล", provinces: ["นนทบุรี", "ปทุมธานี", "นครปฐม", "สมุทรปราการ"] },
    { regionName: "ภาคกลางตอนล่าง 1", provinces: ["กาญจนบุรี", "ราชบุรี", "สุพรรณบุรี"] },
    { regionName: "ภาคกลางตอนล่าง 2", provinces: ["ประจวบคีรีขันธ์", "เพชรบุรี", "สมุทรสงคราม", "สมุทรสาคร"] },
    { regionName: "ภาคใต้ฝั่งอ่าวไทย", provinces: ["ชุมพร", "นครศรีธรรมราช", "พัทลุง", "สุราษฎร์ธานี", "สงขลา"] },
    { regionName: "ภาคใต้ฝั่งอันดามัน", provinces: ["กระบี่", "ตรัง", "พังงา", "ภูเก็ต", "ระนอง", "สตูล"] },
    { regionName: "ภาคใต้ชายแดน", provinces: ["นราธิวาส", "ปัตตานี", "ยะลา"] },
    { regionName: "ภาคตะวันออก 1", provinces: ["ฉะเชิงเทรา", "ชลบุรี", "ระยอง"] },
    { regionName: "ภาคตะวันออก 2", provinces: ["จันทบุรี", "ตราด", "นครนายก", "ปราจีนบุรี", "สระแก้ว"] },
    { regionName: "ภาคตะวันออกเฉียงเหนือตอนบน 1", provinces: ["บึงกาฬ", "เลย", "หนองคาย", "หนองบัวลำภู", "อุดรธานี"] },
    { regionName: "ภาคตะวันออกเฉียงเหนือตอนบน 2", provinces: ["นครพนม", "มุกดาหาร", "สกลนคร"] },
    { regionName: "ภาคตะวันออกเฉียงเหนือตอนกลาง", provinces: ["กาฬสินธุ์", "ขอนแก่น", "มหาสารคาม", "ร้อยเอ็ด"] },
    { regionName: "ภาคตะวันออกเฉียงเหนือตอนล่าง 1", provinces: ["ชัยภูมิ", "นครราชสีมา", "บุรีรัมย์", "สุรินทร์"] },
    { regionName: "ภาคตะวันออกเฉียงเหนือตอนล่าง 2", provinces: ["ยโสธร", "ศรีสะเกษ", "อำนาจเจริญ", "อุบลราชธานี"] },
    { regionName: "ภาคเหนือตอนบน 1", provinces: ["เชียงใหม่", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน"] },
    { regionName: "ภาคเหนือตอนบน 2", provinces: ["เชียงราย", "น่าน", "พะเยา", "แพร่"] },
    { regionName: "ภาคเหนือตอนล่าง 1", provinces: ["ตาก", "พิษณุโลก", "สุโขทัย", "เพชรบูรณ์", "อุตรดิตถ์"] },
    { regionName: "ภาคเหนือตอนล่าง 2", provinces: ["กำแพงเพชร", "นครสวรรค์", "พิจิตร", "อุทัยธานี"] },
    { regionName: "ส่วนกลาง", provinces: ["กรุงเทพมหานคร"] }
];