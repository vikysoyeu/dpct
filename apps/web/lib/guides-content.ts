export type GuideRole = "victim" | "volunteer" | "coordinator";

export type GuideSection = {
  title: string;
  items: string[];
};

export type GuideRoleContent = {
  role: GuideRole;
  label: string;
  title: string;
  summary: string;
  href: string;
  highlights: string[];
  urgentRule: string;
  sections: GuideSection[];
  checklist: string[];
};

export const guideRoles: GuideRoleContent[] = [
  {
    role: "victim",
    label: "Người cần cứu trợ",
    title: "Giữ an toàn và gửi thông tin rõ ràng",
    summary: "Các bước ưu tiên khi bị cô lập, thiếu nhu yếu phẩm hoặc cần hỗ trợ y tế trong vùng thiên tai.",
    href: "/guides/victim",
    highlights: ["Ổn định vị trí", "Gửi yêu cầu đúng dữ liệu", "Giữ liên lạc"],
    urgentRule: "Nếu có nguy cơ sập, nước dâng nhanh, điện rò hoặc người bị thương nặng, hãy ưu tiên gọi lực lượng khẩn cấp tại địa phương trước khi cập nhật lên hệ thống.",
    sections: [
      {
        title: "Việc làm ngay",
        items: [
          "Di chuyển lên vị trí cao, chắc chắn, tránh mép nước chảy xiết, cột điện, cây lớn và công trình có dấu hiệu nứt vỡ.",
          "Tập trung người cùng nhóm tại một điểm dễ nhận diện; ghi lại số người lớn, trẻ em, người cao tuổi, người bệnh và phụ nữ mang thai.",
          "Tắt nguồn điện khu vực bị ngập nếu có thể thao tác an toàn; không chạm thiết bị điện khi tay hoặc nền nhà ướt.",
        ],
      },
      {
        title: "Gửi yêu cầu cứu trợ",
        items: [
          "Cung cấp tên người liên hệ, số điện thoại, địa chỉ gần nhất, mô tả lối vào và mốc nhận diện như trường học, trạm y tế, cầu hoặc ngã ba.",
          "Nêu rõ nhu cầu theo thứ tự khẩn cấp: cấp cứu y tế, sơ tán, nước sạch, thực phẩm, thuốc, áo phao hoặc phương tiện.",
          "Nếu có thể, gửi ảnh hiện trường và cập nhật lại khi mực nước, số người hoặc tình trạng sức khỏe thay đổi.",
        ],
      },
      {
        title: "Nước, thực phẩm và sức khỏe",
        items: [
          "Chỉ dùng nước đóng chai, nước đã đun sôi hoặc đã khử khuẩn; không dùng nước lũ để rửa vết thương hay pha đồ uống.",
          "Giữ thực phẩm khô, thuốc, giấy tờ và pin dự phòng trong túi kín; bỏ thực phẩm đã ngâm nước bẩn.",
          "Với vết thương hở, rửa bằng nước sạch, che bằng gạc hoặc vải sạch và báo rõ nguy cơ nhiễm trùng khi gửi yêu cầu.",
        ],
      },
    ],
    checklist: ["Số người và nhóm dễ tổn thương", "Tọa độ hoặc mốc gần nhất", "Nhu cầu khẩn cấp nhất", "Ảnh hiện trường nếu an toàn", "Số điện thoại còn liên lạc được"],
  },
  {
    role: "volunteer",
    label: "Tình nguyện viên",
    title: "Tác nghiệp theo đội và báo cáo có kiểm chứng",
    summary: "Quy tắc an toàn hiện trường, tiếp nhận nhiệm vụ và phản hồi tình hình để đội điều phối ra quyết định nhanh.",
    href: "/guides/volunteer",
    highlights: ["Không đi một mình", "Ưu tiên bảo hộ", "Báo cáo ngắn gọn"],
    urgentRule: "Tình nguyện viên chỉ vào vùng nguy hiểm khi đã được phân công, có trưởng nhóm, thiết bị bảo hộ và kênh liên lạc ổn định.",
    sections: [
      {
        title: "Trước khi nhận nhiệm vụ",
        items: [
          "Xác nhận trưởng nhóm, tuyến di chuyển, điểm tập kết, khung giờ hoạt động và phương án rút lui.",
          "Kiểm tra áo phao, đèn pin, pin dự phòng, găng tay, khẩu trang, bộ sơ cứu, nước uống và giấy tờ cá nhân.",
          "Không tự ý nhận nhiệm vụ vượt kỹ năng như lái xuồng, cứu hộ dòng chảy, sơ cứu nâng cao hoặc vận chuyển bệnh nhân.",
        ],
      },
      {
        title: "Trong hiện trường",
        items: [
          "Di chuyển tối thiểu theo cặp, giữ liên lạc định kỳ và báo ngay khi mất tín hiệu, thời tiết xấu hoặc tuyến đường bị chặn.",
          "Không lội qua nước chảy xiết, nắp cống mở, khu vực dây điện rơi hoặc nền đường không nhìn thấy đáy.",
          "Khi phát hàng, giữ hàng theo danh sách ưu tiên, tránh tụ tập đông người tại mép nước hoặc đường phương tiện cứu hộ.",
        ],
      },
      {
        title: "Báo cáo về trung tâm",
        items: [
          "Mỗi cập nhật cần có vị trí, thời gian, số người ảnh hưởng, nhu cầu còn thiếu, rủi ro mới và ảnh nếu chụp an toàn.",
          "Phân biệt thông tin trực tiếp quan sát với thông tin nghe lại; ghi rõ nguồn để cán bộ điều phối xác minh.",
          "Kết thúc nhiệm vụ phải bàn giao vật tư còn lại, danh sách đã hỗ trợ và các trường hợp cần theo dõi tiếp.",
        ],
      },
    ],
    checklist: ["Trưởng nhóm và danh sách thành viên", "Thiết bị bảo hộ cá nhân", "Kênh liên lạc dự phòng", "Tuyến đi và điểm rút lui", "Mẫu cập nhật hiện trường"],
  },
  {
    role: "coordinator",
    label: "Cán bộ điều phối",
    title: "Xác minh, ưu tiên và phân bổ nguồn lực",
    summary: "Quy trình tiếp nhận dữ liệu, đánh giá độ khẩn cấp, giao nhiệm vụ và theo dõi kết quả trong cùng một vòng điều phối.",
    href: "/guides/coordinator",
    highlights: ["Xác minh nguồn", "Chấm mức ưu tiên", "Theo dõi hoàn tất"],
    urgentRule: "Mọi quyết định điều phối nên dựa trên thông tin mới nhất, có nguồn rõ ràng và được ghi lại để bàn giao ca trực.",
    sections: [
      {
        title: "Tiếp nhận và xác minh",
        items: [
          "Đối chiếu yêu cầu theo số điện thoại, ảnh, tọa độ, địa danh, báo cáo tình nguyện viên và nguồn địa phương.",
          "Gắn mức ưu tiên cao nhất cho cấp cứu y tế, mắc kẹt nguy hiểm, nhóm dễ tổn thương, thiếu nước sạch kéo dài hoặc khu vực sắp bị cô lập.",
          "Gộp các yêu cầu trùng vị trí để tránh điều xe lặp, nhưng vẫn giữ ghi chú riêng cho từng nhóm người cần hỗ trợ.",
        ],
      },
      {
        title: "Phân bổ nguồn lực",
        items: [
          "Ghép nhiệm vụ với đội có kỹ năng, phương tiện và khoảng cách phù hợp; không giao nhiệm vụ vượt năng lực đội.",
          "Ưu tiên tuyến an toàn, có điểm tập kết và phương án quay đầu; cập nhật bản đồ khi đường bị ngập, sạt lở hoặc ùn tắc.",
          "Theo dõi tồn kho theo đơn vị thực dùng, số lượng đã cam kết, số lượng đã xuất và nhu cầu còn thiếu.",
        ],
      },
      {
        title: "Bàn giao và báo cáo",
        items: [
          "Mỗi ca trực cần bàn giao danh sách yêu cầu chưa xử lý, nhiệm vụ đang đi, nguồn lực còn trống và rủi ro đang mở.",
          "Đóng yêu cầu khi có xác nhận đã hỗ trợ hoặc lý do hủy rõ ràng; không đóng chỉ vì đã giao nhiệm vụ.",
          "Tổng hợp dữ liệu cuối ngày theo khu vực, mức ưu tiên, loại nhu cầu, nguồn lực đã dùng và điểm nghẽn cần xử lý.",
        ],
      },
    ],
    checklist: ["Nguồn xác minh", "Mức ưu tiên", "Đội/phương tiện phù hợp", "Tồn kho khả dụng", "Trạng thái bàn giao ca"],
  },
];

export function getGuideRole(role: string) {
  return guideRoles.find((guide) => guide.role === role);
}
