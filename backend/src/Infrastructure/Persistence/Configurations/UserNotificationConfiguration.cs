using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class UserNotificationConfiguration : IEntityTypeConfiguration<UserNotification>
{
    public void Configure(EntityTypeBuilder<UserNotification> builder)
    {
        builder.HasKey(un => un.Id);

        // Tối ưu truy vấn đếm thông báo chưa đọc của người dùng
        builder.HasIndex(un => new { un.UserId, un.State, un.CreatedAt })
               .HasDatabaseName("IX_UserNotifications_User_State_CreatedAt");


        builder.HasOne(un => un.Notification)
               .WithMany(n => n.UserNotifications)
               .HasForeignKey(un => un.NotificationId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
