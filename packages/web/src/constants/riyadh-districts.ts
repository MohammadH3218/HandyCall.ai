export type RiyadhDistrict = {
  value: string;
  label: string;
  region: string;
  popular?: boolean;
};

const makeDistrict = (
  label: string,
  region: string,
  options?: { value?: string; popular?: boolean },
): RiyadhDistrict => ({
  value:
    options?.value ||
    label
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
  label,
  region,
  popular: options?.popular,
});

export const RIYADH_DISTRICTS: RiyadhDistrict[] = [
  makeDistrict('Al Bat’ha', 'Central Riyadh'),
  makeDistrict('Al Deerah', 'Central Riyadh', { popular: true }),
  makeDistrict("Mi'kal", 'Central Riyadh'),
  makeDistrict('Manfuhah', 'Central Riyadh'),
  makeDistrict('Manfuha Al Jadidah', 'Central Riyadh'),
  makeDistrict("Al 'Oud", 'Central Riyadh'),
  makeDistrict('Al Mansorah', 'Central Riyadh'),
  makeDistrict('Al Margab', 'Central Riyadh'),
  makeDistrict('Salam', 'Central Riyadh'),
  makeDistrict('Jabrah', 'Central Riyadh'),
  makeDistrict('Al Yamamah', 'Central Riyadh'),
  makeDistrict('Otayyigah', 'Central Riyadh'),
  makeDistrict('Al Olaya', 'Al Olaya', { popular: true }),
  makeDistrict('Al Sulaymaniyyah', 'Al Olaya', { popular: true }),
  makeDistrict('Al Izdihar', 'North Riyadh'),
  makeDistrict('King Fahd District', 'North Riyadh', { popular: true }),
  makeDistrict('Al Masif', 'North Riyadh', { popular: true }),
  makeDistrict('Al Murooj', 'North Riyadh', { popular: true }),
  makeDistrict('Al Mugharrazat', 'North Riyadh'),
  makeDistrict('Al Wurood', 'North Riyadh'),
  makeDistrict('King Abdullah Financial District', 'North Riyadh', { popular: true }),
  makeDistrict('Nemar', 'Nemar'),
  makeDistrict('Dharat Nemar', 'Nemar'),
  makeDistrict('Tuwaiq', 'Nemar', { popular: true }),
  makeDistrict('Hazm', 'Nemar'),
  makeDistrict('Deerab', 'Nemar'),
  makeDistrict('Irqah', 'Irqah'),
  makeDistrict('Al Khozama', 'Irqah'),
  makeDistrict('Diplomatic Quarter', 'Irqah', { popular: true }),
  makeDistrict('Al Shumaisi', 'Al Shumaisi'),
  makeDistrict('Eleyshah', 'Al Shumaisi'),
  makeDistrict("Al Badi'ah", 'Al Shumaisi'),
  makeDistrict('Syah', 'Al Shumaisi'),
  makeDistrict('Al Nasriyyah', 'Al Shumaisi'),
  makeDistrict('Umm Sulaim', 'Al Shumaisi'),
  makeDistrict('Al Ma’athar', 'Al Shumaisi'),
  makeDistrict('Umm Al Hamam East', 'Al Shumaisi'),
  makeDistrict('Al Nakheel', 'Al Maathar', { popular: true }),
  makeDistrict('King Saud University', 'Al Maathar'),
  makeDistrict('Umm Al Hamam West', 'Al Maathar'),
  makeDistrict('Al Ma’athar Al Shamali', 'Al Maathar'),
  makeDistrict('Al Rahmaniyyah', 'Al Maathar', { popular: true }),
  makeDistrict('Al Muhammadiyya', 'Al Maathar', { popular: true }),
  makeDistrict('Al Ra’id', 'Al Maathar'),
  makeDistrict('Al Hayir', 'Al Hayir'),
  makeDistrict('Al Ghannamiyyah', 'Al Hayir'),
  makeDistrict('Uraydh', 'Al Hayir'),
  makeDistrict('Al Aziziyah', 'Al Aziziyyah'),
  makeDistrict('Ad Dar Al Baida', 'Al Aziziyyah'),
  makeDistrict('Taybah', 'Al Aziziyyah'),
  makeDistrict('Al Mansurah', 'Al Aziziyyah'),
  makeDistrict('Al Malaz', 'Al Malaz', { popular: true }),
  makeDistrict('Al Rabwah', 'Al Malaz'),
  makeDistrict('Al Rayyan', 'Al Malaz'),
  makeDistrict('Jarir', 'Al Malaz'),
  makeDistrict('Al Murabba’', 'Al Malaz'),
  makeDistrict('Sinaiyah Al Qadimah', 'Al Malaz'),
  makeDistrict('Al Masani’', 'Al Shifa'),
  makeDistrict('Al Shifa', 'Al Shifa', { popular: true }),
  makeDistrict('Al Mansuriyya', 'Al Shifa'),
  makeDistrict('Al Marwah', 'Al Shifa'),
  makeDistrict('Al Urayja', 'Al Urayja'),
  makeDistrict('Al Urayja Al Wusta', 'Al Urayja'),
  makeDistrict('Al Urayja West', 'Al Urayja'),
  makeDistrict('Shubra', 'Al Urayja'),
  makeDistrict('Dharat Laban', 'Al Urayja', { popular: true }),
  makeDistrict('Hijrat Laban', 'Al Urayja'),
  makeDistrict('Al Suwaidi', 'Al Urayja', { popular: true }),
  makeDistrict('Al Suwaidi West', 'Al Urayja'),
  makeDistrict("Dahrat Al Badi'ah", 'Al Urayja'),
  makeDistrict('Sultanah', 'Al Urayja'),
  makeDistrict('Al Malga', 'Al Shamal', { popular: true }),
  makeDistrict('Al Sahafa', 'Al Shamal', { popular: true }),
  makeDistrict('Hittin', 'Al Shamal', { popular: true }),
  makeDistrict('Al Wadi', 'Al Shamal'),
  makeDistrict('Al Ghadir', 'Al Shamal'),
  makeDistrict('Al Nafil', 'Al Shamal'),
  makeDistrict('Imam Mohammad Ibn Saud University', 'Al Shamal'),
  makeDistrict('Al Qayrawan', 'Al Shamal'),
  makeDistrict('Al Aqiq', 'Al Shamal', { popular: true }),
  makeDistrict('Al Arid', 'Al Shamal'),
  makeDistrict('Al Naseem East', 'Al Naseem'),
  makeDistrict('Al Naseem West', 'Al Naseem'),
  makeDistrict('As Salam', 'Al Naseem'),
  makeDistrict('Al Manar', 'Al Naseem'),
  makeDistrict('Al Rimayah', 'Al Naseem'),
  makeDistrict('Al Nadheem', 'Al Naseem'),
  makeDistrict('Al Rawdhah', 'Al Rawdhah', { popular: true }),
  makeDistrict('Al Qadisiyah', 'Al Rawdhah'),
  makeDistrict("Al Ma'aizliyyah", 'Al Rawdhah'),
  makeDistrict('Al Nahdhah', 'Al Rawdhah'),
  makeDistrict('Gharnatah', 'Al Rawdhah'),
  makeDistrict('Qortubah', 'Al Rawdhah'),
  makeDistrict('Al Andalus', 'Al Rawdhah'),
  makeDistrict('Al Hamra', 'Al Rawdhah'),
  makeDistrict('Al Qouds', 'Al Rawdhah'),
  makeDistrict('Al Sulay', 'Al Sulay'),
  makeDistrict("Ad Difa'", 'Al Sulay'),
  makeDistrict('Al Iskan', 'Al Sulay'),
  makeDistrict('Khashm Al Aan', 'Al Sulay'),
  makeDistrict("Al Sa'adah", 'Al Sulay'),
  makeDistrict('Al Fayha', 'Al Sulay'),
  makeDistrict('Al Manakh', 'Al Sulay'),
  makeDistrict('Diriyah', 'Riyadh Outskirts', { popular: true }),
];

export const RIYADH_DISTRICT_GROUPS = RIYADH_DISTRICTS.reduce<Record<string, RiyadhDistrict[]>>(
  (groups, district) => {
    groups[district.region] = groups[district.region] || [];
    groups[district.region].push(district);
    return groups;
  },
  {},
);

export const RIYADH_DISTRICT_VALUES = RIYADH_DISTRICTS.map((district) => district.label);
