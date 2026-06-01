const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const { createTicket, getTicket, updateTicket } = require('./db');
const { embedColor, modRoleName, ticketCategoryName, ticketLogChannelName } = require('./config');

module.exports = {
  id: 'ticket_button_handler',
  async execute(interaction, client) {
    const { customId, guild, member } = interaction;

    // ── Open Ticket ──────────────────────────────────────────────────────────
    if (customId === 'ticket_open') {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      // Check if user already has an open ticket
      const existing = guild.channels.cache.find(
        ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/\s+/g, '-')}` ||
              (ch.topic && ch.topic.includes(member.id))
      );
      if (existing) {
        return interaction.editReply({
          content: `❌ You already have an open ticket: ${existing}`,
        });
      }

      // Find category
      const category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory &&
             c.name.toLowerCase() === ticketCategoryName.toLowerCase()
      );

      // Get mod role
      const modRole = guild.roles.cache.find(r => r.name === modRoleName);

      // Create ticket channel
      const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category || null,
        topic: `Ticket opened by <@${member.id}> (${member.id})`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          ...(modRole
            ? [{
                id: modRole.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageMessages,
                ],
              }]
            : []),
        ],
      });

      // Save to DB
      const ticketData = createTicket(guild.id, ticketChannel.id, member.id, 'General');

      // Send welcome embed requesting proof
      const welcomeEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`🎟️ Ticket #${ticketData.id}`)
        .setDescription(
          `Hello ${member}! Welcome to your support ticket.\n\n` +
          `**Please upload image proof** related to your issue below.\n` +
          `Once received, a moderator will review and assist you.\n\n` +
          `> 📎 Attach your screenshot or image directly to a message in this channel.`
        )
        .setFooter({ text: 'This channel is private — only you and staff can see it.' })
        .setTimestamp();

      const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder().addComponents(closeBtn);

      await ticketChannel.send({
        content: `${member} — Please read the instructions below.`,
        embeds: [welcomeEmbed],
        components: [row],
      });

      await interaction.editReply({
        content: `✅ Your ticket has been created: ${ticketChannel}`,
      });
    }

    // ── Claim Ticket ─────────────────────────────────────────────────────────
    if (customId === 'ticket_claim') {
      const modRole = guild.roles.cache.find(r => r.name === modRoleName);
      const isMod = modRole && member.roles.cache.has(modRole.id);
      if (!isMod) {
        return interaction.reply({ content: '❌ Only moderators can claim tickets.', flags: [MessageFlags.Ephemeral] });
      }

      const ticket = getTicket(guild.id, interaction.channel.id);
      if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', flags: [MessageFlags.Ephemeral] });
      if (ticket.claimedBy) {
        return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>.`, flags: [MessageFlags.Ephemeral] });
      }

      updateTicket(guild.id, interaction.channel.id, {
        status: 'claimed',
        claimedBy: member.id,
      });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription(`🙋 This ticket has been **claimed** by ${member}.`);

      // Disable claim button in previous message
      await interaction.update({ components: [] }).catch(() => {});
      await interaction.channel.send({ embeds: [embed] });
    }

    // ── Close Ticket ─────────────────────────────────────────────────────────
    if (customId === 'ticket_close') {
      const ticket = getTicket(guild.id, interaction.channel.id);
      if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', flags: [MessageFlags.Ephemeral] });

      const modRole = guild.roles.cache.find(r => r.name === modRoleName);
      const isMod = modRole && member.roles.cache.has(modRole.id);
      const isOwner = member.id === ticket.userId;

      if (!isMod && !isOwner) {
        return interaction.reply({ content: '❌ Only the ticket owner or moderators can close this ticket.', flags: [MessageFlags.Ephemeral] });
      }

      await interaction.deferReply();

      updateTicket(guild.id, interaction.channel.id, {
        status: 'closed',
        closedAt: Date.now(),
      });

      // Build transcript (last 50 messages)
      const messages = await interaction.channel.messages.fetch({ limit: 50 });
      const transcript = messages
        .reverse()
        .map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}${m.attachments.size ? ` [${m.attachments.size} attachment(s)]` : ''}`)
        .join('\n');

      // Log to ticket-logs channel
      const logChannel = guild.channels.cache.find(c => c.name === ticketLogChannelName);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`🔒 Ticket #${ticket.id} Closed`)
          .addFields(
            { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed by', value: `${member}`, inline: true },
            { name: 'Claimed by', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Unclaimed', inline: true },
            { name: 'Proof images', value: `${ticket.proofImages?.length || 0}`, inline: true },
            { name: 'Status', value: ticket.proofImages?.length ? '✅ Proof provided' : '❌ No proof', inline: true },
          )
          .setTimestamp();

        if (ticket.proofImages?.length) {
          logEmbed.setImage(ticket.proofImages[0]);
        }

        // Post transcript as a text file
        const transcriptFile = new AttachmentBuilder(
          Buffer.from(transcript, 'utf-8'),
          { name: `ticket-${ticket.id}-transcript.txt` }
        );

        await logChannel.send({ embeds: [logEmbed], files: [transcriptFile] });
      }

      await interaction.editReply({ content: '🔒 Ticket is being closed...' });

      // Delete channel after short delay
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};
