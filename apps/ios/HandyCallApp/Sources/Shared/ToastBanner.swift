import SwiftUI

struct ToastBanner: View {
    let text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(HandyCallTheme.emerald)
            Text(text)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(HandyCallTheme.slate.opacity(0.92))
        )
        .shadow(color: .black.opacity(0.18), radius: 14, y: 6)
        .padding(.horizontal, 16)
    }
}
